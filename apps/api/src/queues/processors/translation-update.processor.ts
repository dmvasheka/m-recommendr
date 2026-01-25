import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import axios from 'axios';
import { supabase } from '@repo/db';

export interface TranslationUpdateJob {
    type: 'movies' | 'tv';
    limit?: number;
    offset?: number;
    force?: boolean; // Update even if translations exist
    ids?: number[]; // Specific IDs to update
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const TRANSLATION_LANGUAGES = ['en-US', 'ru-RU', 'uk-UA'];
const DELAY_BETWEEN_ITEMS = 350;
const DELAY_BETWEEN_LANGUAGES = 100;
const MAX_RETRIES = 3;
const BASE_DELAY = 10000; // 10 seconds base delay for exponential backoff

@Processor('translation-update')
export class TranslationUpdateProcessor extends WorkerHost {
    private readonly logger = new Logger(TranslationUpdateProcessor.name);
    private readonly tmdbApiKey: string;

    constructor() {
        super();
        if (!process.env.TMDB_API_KEY) {
            throw new Error('TMDB_API_KEY is not defined in environment variables');
        }
        this.tmdbApiKey = process.env.TMDB_API_KEY;
    }

    /**
     * Fetch localized posters using /images endpoint
     */
    private async fetchLocalizedPosters(
        id: number,
        type: 'movies' | 'tv'
    ): Promise<Record<string, { poster_url: string | null; backdrop_url: string | null }>> {
        const result: Record<string, { poster_url: string | null; backdrop_url: string | null }> = {};
        const endpoint = type === 'movies' ? 'movie' : 'tv';

        try {
            const response = await axios.get(`${TMDB_BASE_URL}/${endpoint}/${id}/images`, {
                params: {
                    api_key: this.tmdbApiKey,
                    include_image_language: 'en,ru,uk,null',
                },
                timeout: 10000,
            });

            const posters = response.data.posters || [];
            const backdrops = response.data.backdrops || [];

            // Group by language, pick highest voted
            const postersByLang: Record<string, any> = {};
            for (const poster of posters) {
                const lang = poster.iso_639_1 || 'en';
                if (!postersByLang[lang] || poster.vote_average > postersByLang[lang].vote_average) {
                    postersByLang[lang] = poster;
                }
            }

            const backdropsByLang: Record<string, any> = {};
            for (const backdrop of backdrops) {
                const lang = backdrop.iso_639_1 || 'en';
                if (!backdropsByLang[lang] || backdrop.vote_average > backdropsByLang[lang].vote_average) {
                    backdropsByLang[lang] = backdrop;
                }
            }

            for (const langCode of ['en', 'ru', 'uk']) {
                const poster = postersByLang[langCode] || postersByLang['en'] || posters[0];
                const backdrop = backdropsByLang[langCode] || backdropsByLang['en'] || backdrops[0];

                result[langCode] = {
                    poster_url: poster?.file_path ? `${TMDB_IMAGE_BASE_URL}/w500${poster.file_path}` : null,
                    backdrop_url: backdrop?.file_path ? `${TMDB_IMAGE_BASE_URL}/original${backdrop.file_path}` : null,
                };
            }
        } catch (error) {
            // Silent fail
        }

        return result;
    }

    /**
     * Fetch translations for movie/TV with capped retries and exponential backoff
     */
    private async fetchTranslations(
        id: number,
        type: 'movies' | 'tv',
        attempt: number = 0
    ): Promise<Record<string, any> | null> {
        const translations: Record<string, any> = {};
        const endpoint = type === 'movies' ? 'movie' : 'tv';

        try {
            // Fetch localized posters first
            const localizedPosters = await this.fetchLocalizedPosters(id, type);

            for (const lang of TRANSLATION_LANGUAGES) {
                const response = await axios.get(`${TMDB_BASE_URL}/${endpoint}/${id}`, {
                    params: {
                        api_key: this.tmdbApiKey,
                        language: lang,
                    },
                    timeout: 10000,
                });

                const data = response.data;
                const langCode = lang.split('-')[0];
                const localizedImages = localizedPosters[langCode] || { poster_url: null, backdrop_url: null };

                if (type === 'movies') {
                    translations[langCode] = {
                        title: data.title,
                        description: data.overview || null,
                        tagline: data.tagline || null,
                        poster_url: localizedImages.poster_url || (data.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${data.poster_path}` : null),
                        backdrop_url: localizedImages.backdrop_url || (data.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${data.backdrop_path}` : null),
                    };
                } else {
                    translations[langCode] = {
                        name: data.name,
                        overview: data.overview || null,
                        tagline: data.tagline || null,
                        poster_url: localizedImages.poster_url || (data.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${data.poster_path}` : null),
                        backdrop_url: localizedImages.backdrop_url || (data.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${data.backdrop_path}` : null),
                    };
                }

                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_LANGUAGES));
            }

            return translations;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 429) {
                if (attempt < MAX_RETRIES) {
                    const backoff = BASE_DELAY * Math.pow(2, attempt);
                    this.logger.warn(
                        `Rate limit for ${type} ${id}, retry ${attempt + 1}/${MAX_RETRIES} after ${backoff}ms`
                    );
                    await new Promise(resolve => setTimeout(resolve, backoff));
                    return this.fetchTranslations(id, type, attempt + 1);
                } else {
                    this.logger.warn(
                        `Max retries (${MAX_RETRIES}) reached for ${type} ${id} due to rate limiting`
                    );
                    return null;
                }
            }
            return null;
        }
    }

    async process(job: Job<TranslationUpdateJob>): Promise<any> {
        const { type, limit = 100, offset = 0, force = false, ids } = job.data;

        // Validate TMDB API key before processing
        if (!TMDB_API_KEY || TMDB_API_KEY.trim() === '') {
            const errorMsg = 'TMDB_API_KEY is not configured. Cannot fetch translations.';
            this.logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        this.logger.log(`🌐 Starting ${type} translation update: limit=${limit}, offset=${offset}, force=${force}`);

        const tableName = type === 'movies' ? 'movies' : 'tv_shows';
        const idField = 'id';
        const nameField = type === 'movies' ? 'title' : 'name';

        let query = supabase
            .from(tableName)
            .select(`${idField}, ${nameField}`);

        // Filter by specific IDs or by missing translations
        if (ids && ids.length > 0) {
            query = query.in(idField, ids);
        } else if (!force) {
            query = query.or('translations.is.null,translations.eq.{}');
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;

        if (error) {
            this.logger.error(`Failed to fetch ${type}: ${error.message}`);
            throw error;
        }

        if (!data || data.length === 0) {
            this.logger.log(`✅ No ${type} need translation updates`);
            return { updated: 0, failed: 0 };
        }

        this.logger.log(`📊 Found ${data.length} ${type} to update`);

        let updated = 0;
        let failed = 0;

        for (let i = 0; i < data.length; i++) {
            const item = data[i] as any;
            const itemId = item[idField];
            const itemName = item[nameField];

            await job.updateProgress(Math.round((i / data.length) * 100));

            const translations = await this.fetchTranslations(itemId, type);

            if (translations && Object.keys(translations).length > 0) {
                const { error: updateError } = await (supabase
                    .from(tableName) as any)
                    .update({ translations })
                    .eq(idField, itemId);

                if (updateError) {
                    this.logger.error(`❌ Failed to update ${type} ${itemId}: ${updateError.message}`);
                    failed++;
                } else {
                    // Check if localized posters were found
                    const hasLocalizedPosters = translations.ru?.poster_url !== translations.en?.poster_url;
                    if (hasLocalizedPosters) {
                        this.logger.log(`✅ [${i + 1}/${data.length}] ${itemName} - localized posters found`);
                    } else {
                        this.logger.debug(`✅ [${i + 1}/${data.length}] ${itemName} - updated (same posters)`);
                    }
                    updated++;
                }
            } else {
                failed++;
            }

            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ITEMS));
        }

        await job.updateProgress(100);

        this.logger.log(`✅ ${type} translation update completed: ${updated} updated, ${failed} failed`);

        return { updated, failed };
    }
}
