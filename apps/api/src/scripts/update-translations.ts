#!/usr/bin/env tsx
/**
 * Script to update translations for existing movies in the database
 *
 * Usage:
 *   tsx src/scripts/update-translations.ts [--movies | --tv | --all] [--limit=N] [--offset=N] [--force]
 *
 * Options:
 *   --movies    Update only movies
 *   --tv        Update only TV shows
 *   --all       Update both (default)
 *   --limit=N   Process only N items
 *   --offset=N  Start from offset N
 *   --force     Update ALL items, even those with existing translations (for re-fetching localized posters)
 *
 * Examples:
 *   tsx src/scripts/update-translations.ts --movies --limit=10
 *   tsx src/scripts/update-translations.ts --tv
 *   tsx src/scripts/update-translations.ts --all
 *   tsx src/scripts/update-translations.ts --all --force --limit=100  # Re-fetch localized posters for 100 items
 */

import axios from 'axios';
import { supabase } from '@repo/db';

type MovieRow = { id: number; title: string };
type TvRow = { id: number; name: string };
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const TRANSLATION_LANGUAGES = ['en-US', 'ru-RU', 'uk-UA'];
const DELAY_BETWEEN_MOVIES = 350; // ms between movies (to stay under rate limits)
const DELAY_BETWEEN_LANGUAGES = 100; // ms between language requests

// Statistics
const stats = {
    moviesProcessed: 0,
    moviesUpdated: 0,
    moviesFailed: 0,
    tvProcessed: 0,
    tvUpdated: 0,
    tvFailed: 0,
    startTime: Date.now(),
};

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
    movies: args.includes('--movies'),
    tv: args.includes('--tv'),
    all: args.includes('--all'),
    force: args.includes('--force'), // Update even existing translations
    limit: parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '0'),
    offset: parseInt(args.find(arg => arg.startsWith('--offset='))?.split('=')[1] || '0'),
};

// Default to all if nothing specified
if (!flags.movies && !flags.tv && !flags.all) {
    flags.all = true;
}

/**
 * Fetch localized posters for a movie using /images endpoint
 */
async function fetchMovieLocalizedPosters(movieId: number): Promise<Record<string, { poster_url: string | null; backdrop_url: string | null }>> {
    const result: Record<string, { poster_url: string | null; backdrop_url: string | null }> = {};

    try {
        const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}/images`, {
            params: {
                api_key: TMDB_API_KEY,
                include_image_language: 'en,ru,uk,null',
            },
            timeout: 10000,
        });

        const posters = response.data.posters || [];
        const backdrops = response.data.backdrops || [];

        // Group posters by language, picking the highest voted one
        const postersByLang: Record<string, any> = {};
        for (const poster of posters) {
            const lang = poster.iso_639_1 || 'en';
            if (!postersByLang[lang] || poster.vote_average > postersByLang[lang].vote_average) {
                postersByLang[lang] = poster;
            }
        }

        // Group backdrops by language
        const backdropsByLang: Record<string, any> = {};
        for (const backdrop of backdrops) {
            const lang = backdrop.iso_639_1 || 'en';
            if (!backdropsByLang[lang] || backdrop.vote_average > backdropsByLang[lang].vote_average) {
                backdropsByLang[lang] = backdrop;
            }
        }

        // Build result for each supported language
        for (const langCode of ['en', 'ru', 'uk']) {
            const poster = postersByLang[langCode] || postersByLang['en'] || posters[0];
            const backdrop = backdropsByLang[langCode] || backdropsByLang['en'] || backdrops[0];

            result[langCode] = {
                poster_url: poster?.file_path ? `${TMDB_IMAGE_BASE_URL}/w500${poster.file_path}` : null,
                backdrop_url: backdrop?.file_path ? `${TMDB_IMAGE_BASE_URL}/original${backdrop.file_path}` : null,
            };
        }

        const foundLangs = Object.keys(postersByLang).filter(l => ['en', 'ru', 'uk'].includes(l));
        if (foundLangs.length > 1) {
            console.log(`    🖼️  Found localized posters: ${foundLangs.join(', ')}`);
        }
    } catch (error) {
        // Silent fail - we'll use default posters
    }

    return result;
}

/**
 * Fetch translations for a movie from TMDB
 */
async function fetchMovieTranslations(movieId: number): Promise<Record<string, any> | null> {
    const translations: Record<string, any> = {};

    try {
        // First, fetch localized posters
        const localizedPosters = await fetchMovieLocalizedPosters(movieId);

        for (const lang of TRANSLATION_LANGUAGES) {
            const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, {
                params: {
                    api_key: TMDB_API_KEY,
                    language: lang,
                },
                timeout: 10000,
            });

            const data = response.data;
            const langCode = lang.split('-')[0]; // 'en-US' -> 'en'

            // Use localized poster if available
            const localizedImages = localizedPosters[langCode] || { poster_url: null, backdrop_url: null };

            translations[langCode] = {
                title: data.title,
                description: data.overview || null,
                tagline: data.tagline || null,
                poster_url: localizedImages.poster_url || (data.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${data.poster_path}` : null),
                backdrop_url: localizedImages.backdrop_url || (data.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${data.backdrop_path}` : null),
            };

            // Delay between language requests
            if (TRANSLATION_LANGUAGES.indexOf(lang) < TRANSLATION_LANGUAGES.length - 1) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_LANGUAGES));
            }
        }

        return translations;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 404) {
                console.error(`  ⚠️  Movie ${movieId} not found on TMDB`);
            } else if (error.response?.status === 429) {
                console.error(`  ⚠️  Rate limit exceeded, waiting 10 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
                return fetchMovieTranslations(movieId); // Retry
            } else {
                console.error(`  ❌ Error fetching movie ${movieId}:`, error.message);
            }
        } else {
            console.error(`  ❌ Unknown error for movie ${movieId}:`, error);
        }
        return null;
    }
}

/**
 * Fetch localized posters for a TV show using /images endpoint
 */
async function fetchTvLocalizedPosters(tvId: number): Promise<Record<string, { poster_url: string | null; backdrop_url: string | null }>> {
    const result: Record<string, { poster_url: string | null; backdrop_url: string | null }> = {};

    try {
        const response = await axios.get(`${TMDB_BASE_URL}/tv/${tvId}/images`, {
            params: {
                api_key: TMDB_API_KEY,
                include_image_language: 'en,ru,uk,null',
            },
            timeout: 10000,
        });

        const posters = response.data.posters || [];
        const backdrops = response.data.backdrops || [];

        // Group posters by language
        const postersByLang: Record<string, any> = {};
        for (const poster of posters) {
            const lang = poster.iso_639_1 || 'en';
            if (!postersByLang[lang] || poster.vote_average > postersByLang[lang].vote_average) {
                postersByLang[lang] = poster;
            }
        }

        // Group backdrops by language
        const backdropsByLang: Record<string, any> = {};
        for (const backdrop of backdrops) {
            const lang = backdrop.iso_639_1 || 'en';
            if (!backdropsByLang[lang] || backdrop.vote_average > backdropsByLang[lang].vote_average) {
                backdropsByLang[lang] = backdrop;
            }
        }

        // Build result for each supported language
        for (const langCode of ['en', 'ru', 'uk']) {
            const poster = postersByLang[langCode] || postersByLang['en'] || posters[0];
            const backdrop = backdropsByLang[langCode] || backdropsByLang['en'] || backdrops[0];

            result[langCode] = {
                poster_url: poster?.file_path ? `${TMDB_IMAGE_BASE_URL}/w500${poster.file_path}` : null,
                backdrop_url: backdrop?.file_path ? `${TMDB_IMAGE_BASE_URL}/original${backdrop.file_path}` : null,
            };
        }

        const foundLangs = Object.keys(postersByLang).filter(l => ['en', 'ru', 'uk'].includes(l));
        if (foundLangs.length > 1) {
            console.log(`    🖼️  Found localized posters: ${foundLangs.join(', ')}`);
        }
    } catch (error) {
        // Silent fail - we'll use default posters
    }

    return result;
}

/**
 * Fetch translations for a TV show from TMDB
 */
async function fetchTvTranslations(tvId: number): Promise<Record<string, any> | null> {
    const translations: Record<string, any> = {};

    try {
        // First, fetch localized posters
        const localizedPosters = await fetchTvLocalizedPosters(tvId);

        for (const lang of TRANSLATION_LANGUAGES) {
            const response = await axios.get(`${TMDB_BASE_URL}/tv/${tvId}`, {
                params: {
                    api_key: TMDB_API_KEY,
                    language: lang,
                },
                timeout: 10000,
            });

            const data = response.data;
            const langCode = lang.split('-')[0];

            // Use localized poster if available
            const localizedImages = localizedPosters[langCode] || { poster_url: null, backdrop_url: null };

            translations[langCode] = {
                name: data.name,
                overview: data.overview || null,
                tagline: data.tagline || null,
                poster_url: localizedImages.poster_url || (data.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${data.poster_path}` : null),
                backdrop_url: localizedImages.backdrop_url || (data.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${data.backdrop_path}` : null),
            };

            if (TRANSLATION_LANGUAGES.indexOf(lang) < TRANSLATION_LANGUAGES.length - 1) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_LANGUAGES));
            }
        }

        return translations;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 404) {
                console.error(`  ⚠️  TV show ${tvId} not found on TMDB`);
            } else if (error.response?.status === 429) {
                console.error(`  ⚠️  Rate limit exceeded, waiting 10 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
                return fetchTvTranslations(tvId);
            } else {
                console.error(`  ❌ Error fetching TV ${tvId}:`, error.message);
            }
        } else {
            console.error(`  ❌ Unknown error for TV ${tvId}:`, error);
        }
        return null;
    }
}

/**
 * Update translations for movies
 */
async function updateMovieTranslations() {
    console.log('\n🎬 Starting movie translations update...\n');

    // Get movies - either all (force) or only those without translations
    let query = supabase
        .from('movies')
        .select('id, title');

    // Only filter by missing translations if --force is not set
    if (!flags.force) {
        query = query.or('translations.is.null,translations.eq.{}');
    }

    if (flags.limit > 0) {
        query = query.limit(flags.limit);
    }

    if (flags.offset > 0) {
        query = query.range(flags.offset, flags.offset + (flags.limit || 1000) - 1);
    }

    const { data, error } = await query;

    if (error) {
        console.error('❌ Error fetching movies:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('✅ No movies need translation updates');
        return;
    }

    const movies = data as MovieRow[];

    console.log(`📊 Found ${movies.length} movies to update\n`);

    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];

        if (!movie) {
            console.log(`[${i + 1}/${movies.length}] ⚠️ Skipping: movie is undefined`);
            continue;
        }

        stats.moviesProcessed++;

        console.log(`[${i + 1}/${movies.length}] Processing movie ID ${movie.id}: ${movie.title}`);

        const translations = await fetchMovieTranslations(movie.id);

        if (translations && Object.keys(translations).length > 0) {
            // Update database
            const { error: updateError } = await supabase
                .from('movies')
                // @ts-ignore - Supabase type inference issue with partial selects
                .update({ translations })
                .eq('id', movie.id);

            if (updateError) {
                console.error(`  ❌ Failed to update DB:`, updateError.message);
                stats.moviesFailed++;
            } else {
                console.log(`  ✅ Updated with ${Object.keys(translations).length} translations`);
                stats.moviesUpdated++;
            }
        } else {
            stats.moviesFailed++;
        }

        // Delay between movies
        if (i < movies.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MOVIES));
        }

        // Progress report every 10 movies
        if ((i + 1) % 10 === 0) {
            printProgress();
        }
    }
}

/**
 * Update translations for TV shows
 */
async function updateTvTranslations() {
    console.log('\n📺 Starting TV show translations update...\n');

    let query = supabase
        .from('tv_shows')
        .select('id, name');

    // Only filter by missing translations if --force is not set
    if (!flags.force) {
        query = query.or('translations.is.null,translations.eq.{}');
    }

    if (flags.limit > 0) {
        query = query.limit(flags.limit);
    }

    if (flags.offset > 0) {
        query = query.range(flags.offset, flags.offset + (flags.limit || 1000) - 1);
    }

    const { data, error } = await query;

    if (error) {
        console.error('❌ Error fetching TV shows:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('✅ No TV shows need translation updates');
        return;
    }

    const tvShows = data as TvRow[];

    console.log(`📊 Found ${tvShows.length} TV shows to update\n`);

    for (let i = 0; i < tvShows.length; i++) {
        const tv = tvShows[i];

        if (!tv) {
            console.log(`[${i + 1}/${tvShows.length}] ⚠️ Skipping: tv is undefined`);
            continue;
        }

        stats.tvProcessed++;

        console.log(`[${i + 1}/${tvShows.length}] Processing TV ID ${tv.id}: ${tv.name}`);

        const translations = await fetchTvTranslations(tv.id);

        if (translations && Object.keys(translations).length > 0) {
            const { error: updateError } = await supabase
                .from('tv_shows')
                // @ts-ignore - Supabase type inference issue with partial selects
                .update({ translations })
                .eq('id', tv.id);

            if (updateError) {
                console.error(`  ❌ Failed to update DB:`, updateError.message);
                stats.tvFailed++;
            } else {
                console.log(`  ✅ Updated with ${Object.keys(translations).length} translations`);
                stats.tvUpdated++;
            }
        } else {
            stats.tvFailed++;
        }

        if (i < tvShows.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MOVIES));
        }

        if ((i + 1) % 10 === 0) {
            printProgress();
        }
    }
}

/**
 * Print progress statistics
 */
function printProgress() {
    const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
    console.log(`\n📈 Progress Report (${elapsed}s elapsed):`);
    if (flags.movies || flags.all) {
        console.log(`   Movies: ${stats.moviesUpdated} updated, ${stats.moviesFailed} failed, ${stats.moviesProcessed} total`);
    }
    if (flags.tv || flags.all) {
        console.log(`   TV Shows: ${stats.tvUpdated} updated, ${stats.tvFailed} failed, ${stats.tvProcessed} total`);
    }
    console.log('');
}

/**
 * Main function
 */
async function main() {
    if (!TMDB_API_KEY) {
        console.error('❌ Error: TMDB_API_KEY not found in environment variables');
        process.exit(1);
    }

    console.log('🚀 Translation Update Script');
    console.log('============================');
    console.log(`Mode: ${flags.all ? 'ALL' : flags.movies ? 'MOVIES' : 'TV SHOWS'}`);
    console.log(`Force update: ${flags.force ? 'YES (re-fetching all)' : 'NO (only missing)'}`);
    console.log(`Limit: ${flags.limit || 'No limit'}`);
    console.log(`Offset: ${flags.offset || 0}`);
    console.log(`Languages: ${TRANSLATION_LANGUAGES.join(', ')}`);
    console.log(`Delay: ${DELAY_BETWEEN_MOVIES}ms between items, ${DELAY_BETWEEN_LANGUAGES}ms between languages`);

    try {
        if (flags.movies || flags.all) {
            await updateMovieTranslations();
        }

        if (flags.tv || flags.all) {
            await updateTvTranslations();
        }

        // Final report
        console.log('\n═══════════════════════════════════════');
        console.log('📊 FINAL REPORT');
        console.log('═══════════════════════════════════════');
        printProgress();
        console.log('✅ Done!');
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the script
main();
