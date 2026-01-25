import { Injectable, Logger } from '@nestjs/common';
import { supabase } from '@repo/db';
import { RedisService } from '../redis/redis.service';
import { generateEmbedding } from '@repo/ai';

export interface TvShowSearchResult {
    id: number;
    name: string;
    overview: string;
    poster_url: string;
    backdrop_url: string;
    vote_average: number;
    popularity: number;
    similarity: number;
}

@Injectable()
export class TvShowsService {
    private readonly logger = new Logger(TvShowsService.name);

    constructor(private readonly redisService: RedisService) {}

    /**
     * Semantic search - find TV shows by query text
     */
    async searchTvShows(query: string, limit = 10, language = 'en'): Promise<TvShowSearchResult[]> {
        try {
            this.logger.log(`Searching TV shows for: "${query}" (language: ${language})`);

            const cacheKey = `tv_search:${query.toLowerCase()}:${limit}:${language}`;
            const cached = await this.redisService.get<TvShowSearchResult[]>(cacheKey);

            if (cached) {
                this.logger.log(`✅ Cache HIT for "${query}"`);
                return cached;
            }

            this.logger.log(`❌ Cache MISS for "${query}" - generating...`);

            // 1. Generate embedding for search query
            const queryEmbedding = await generateEmbedding(query);

            // 2. Use Supabase RPC to call match_tv_shows function
            const { data, error } = await (supabase.rpc as any)('match_tv_shows', {
                query_embedding: JSON.stringify(queryEmbedding),
                match_count: limit,
            });

            if (error) {
                throw error;
            }

            let results: any = data;
            this.logger.log(`Found ${results?.length || 0} results`);

            // Apply translations if not English
            if (results && language !== 'en') {
                this.logger.log(`Applying ${language} translations to ${results.length} search results`);
                results = results.map((tvShow: any) => {
                    const translation = tvShow.translations?.[language];
                    if (translation) {
                        return {
                            ...tvShow,
                            name: translation.name || tvShow.name,
                            overview: translation.overview || tvShow.overview,
                            poster_url: translation.poster_url || tvShow.poster_url,
                            backdrop_url: translation.backdrop_url || tvShow.backdrop_url,
                        };
                    }
                    return tvShow;
                });
            }

            if (results && results.length > 0) {
                await this.redisService.set(cacheKey, results, 3600);
                this.logger.log(`💾 Cached results for "${query}"`);
            }

            return results || [];
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Search error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get TV show by ID
     */
    async getTvShowById(tvShowId: number, language = 'en') {
        try {
            this.logger.log(`Getting TV show ID ${tvShowId} with language: ${language}`);

            const { data: tvShow, error } = await supabase
                .from('tv_shows')
                .select('*')
                .eq('id', tvShowId)
                .single();

            if (error) {
                throw error;
            }

            if (!tvShow) {
                return null;
            }

            // Log translation data for debugging
            const translations = (tvShow as any).translations;
            this.logger.log(`TV show ${tvShowId} has translations: ${translations ? 'YES' : 'NO'}`);
            if (translations) {
                this.logger.log(`Available languages: ${Object.keys(translations).join(', ')}`);
            }

            // Apply translations if available and language is not English
            if (language !== 'en' && translations) {
                const translation = translations[language];

                if (translation) {
                    this.logger.log(`Applying ${language} translation for TV show ${tvShowId}`);
                    return {
                        ...(tvShow as any),
                        name: translation.name || (tvShow as any).name,
                        overview: translation.overview || (tvShow as any).overview,
                        poster_url: translation.poster_url || (tvShow as any).poster_url,
                        backdrop_url: translation.backdrop_url || (tvShow as any).backdrop_url,
                    };
                } else {
                    this.logger.log(`No ${language} translation found for TV show ${tvShowId}, using original`);
                }
            }

            return tvShow;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get TV show error: ${errorMessage}`);
            return null;
        }
    }

    /**
     * Get all TV shows with pagination
     */
    async getAllTvShows(page = 1, pageSize = 20, language = 'en') {
        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            // Get total count
            const { count } = await supabase
                .from('tv_shows')
                .select('*', { count: 'exact', head: true });

            // Get paginated TV shows - include translations field
            const { data, error } = await supabase
                .from('tv_shows')
                .select('id, name, overview, poster_url, genres, vote_average, popularity, first_air_date, translations')
                .order('popularity', { ascending: false })
                .range(from, to);

            if (error) {
                throw error;
            }

            let tvShows: any[] = data || [];

            // Apply translations if not English
            if (language !== 'en' && tvShows.length > 0) {
                this.logger.log(`Applying ${language} translations to ${tvShows.length} TV shows in list`);
                tvShows = tvShows.map((tvShow: any) => {
                    const translation = tvShow.translations?.[language];
                    if (translation) {
                        return {
                            ...tvShow,
                            name: translation.name || tvShow.name,
                            overview: translation.overview || tvShow.overview,
                            poster_url: translation.poster_url || tvShow.poster_url,
                        };
                    }
                    return tvShow;
                });
            }

            return {
                tvShows,
                total: count || 0,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get all TV shows error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get TV shows with cursor-based pagination
     */
    async getTvShowsByCursor(
        limit = 20,
        language = 'en',
        cursor?: { popularity: number; id: number },
    ): Promise<{ tvShows: any[]; nextCursor: string | null; hasMore: boolean }> {
        try {
            let query = supabase
                .from('tv_shows')
                .select('id, name, overview, poster_url, genres, vote_average, popularity, first_air_date, translations')
                .not('popularity', 'is', null)
                .order('popularity', { ascending: false })
                .order('id', { ascending: false })
                .limit(limit + 1);

            if (cursor) {
                query = query.or(
                    `and(popularity.eq.${cursor.popularity},id.lt.${cursor.id}),popularity.lt.${cursor.popularity}`,
                );
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            const rows = (data || []) as any[];
            const hasMore = rows.length > limit;
            let tvShows = rows.slice(0, limit);

            if (language !== 'en' && tvShows.length > 0) {
                this.logger.log(`Applying ${language} translations to ${tvShows.length} TV shows in list`);
                tvShows = tvShows.map((tvShow: any) => {
                    const translation = tvShow.translations?.[language];
                    if (translation) {
                        return {
                            ...tvShow,
                            name: translation.name || tvShow.name,
                            overview: translation.overview || tvShow.overview,
                            poster_url: translation.poster_url || tvShow.poster_url,
                        };
                    }
                    return tvShow;
                });
            }

            const lastItem = tvShows[tvShows.length - 1];
            const nextCursor = hasMore && lastItem && lastItem.popularity != null
                ? `${lastItem.popularity}:${lastItem.id}`
                : null;

            return { tvShows, nextCursor, hasMore };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get TV shows by cursor error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get seasons for a TV show
     */
    async getTvShowSeasons(tvShowId: number) {
        try {
            const { data, error } = await supabase
                .from('tv_seasons')
                .select('*')
                .eq('tv_show_id', tvShowId)
                .order('season_number', { ascending: true });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get TV show seasons error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Fast prefix/substring search for autocomplete
     */
    async autocomplete(query: string, limit = 10, language = 'en') {
        try {
            // Sanitize query: escape special LIKE characters and trim
            const sanitizedQuery = query
                .replace(/[%_]/g, '\\$&')
                .trim();

            if (!sanitizedQuery) {
                return [];
            }

            this.logger.log(`Autocomplete TV for: "${sanitizedQuery}" (language: ${language})`);

            // Search by name using ilike (case-insensitive substring)
            const { data, error } = await supabase
                .from('tv_shows')
                .select('id, name, poster_url, first_air_date, vote_average, translations')
                .ilike('name', `%${sanitizedQuery}%`)
                .order('popularity', { ascending: false })
                .limit(limit);

            if (error) {
                throw error;
            }

            let results: any[] = data || [];

            // Apply translations if not English
            if (language !== 'en' && results.length > 0) {
                this.logger.log(`Applying ${language} translations to ${results.length} autocomplete results`);
                results = results.map((tvShow: any) => {
                    const translation = tvShow.translations?.[language];
                    if (translation) {
                        return {
                            ...tvShow,
                            name: translation.name || tvShow.name,
                            poster_url: translation.poster_url || tvShow.poster_url,
                        };
                    }
                    return tvShow;
                });
            }

            return results;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Autocomplete TV error: ${errorMessage}`);
            throw error;
        }
    }
}
