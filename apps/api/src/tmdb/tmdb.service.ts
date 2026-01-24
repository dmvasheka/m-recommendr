import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import axios from 'axios';
import { supabase } from '@repo/db';
import type { MovieInsert, TvShowInsert, TvSeasonInsert, TvEpisodeInsert, TvSeason, TvEpisode } from '@repo/db';
import { EmbeddingsService } from '../embeddings/embeddings.service'; // Import EmbeddingsService
import { ImportProgressService } from './import-progress.service';

// TMDB API Response types
export interface TmdbMovie {
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    genre_ids: number[];
    release_date: string;
    vote_average: number;
    vote_count: number;
    popularity: number;
    original_language: string;
}

export interface TmdbMovieDetails extends TmdbMovie {
    runtime: number | null;
    genres: { id: number; name: string }[];
    tagline?: string | null;
    production_companies?: { id: number; name: string }[];
}

export interface TmdbTvShow {
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    genre_ids: number[];
    first_air_date: string;
    vote_average: number;
    vote_count: number;
    popularity: number;
    original_language: string;
    origin_country: string[];
}

export interface TmdbTvDetails extends TmdbTvShow {
    number_of_seasons: number;
    number_of_episodes: number;
    genres: { id: number; name: string }[];
    tagline?: string | null;
    production_companies?: { id: number; name: string }[];
    status: string;
    last_air_date: string;
}

export interface TmdbSeasonDetails {
    _id: string;
    air_date: string;
    episodes: {
        air_date: string;
        episode_number: number;
        id: number;
        name: string;
        overview: string;
        production_code: string;
        runtime: number;
        season_number: number;
        show_id: number;
        still_path: string;
        vote_average: number;
        vote_count: number;
    }[];
    name: string;
    overview: string;
    id: number;
    poster_path: string;
    season_number: number;
    vote_average: number;
}

export interface TmdbSearchResponse {
    page: number;
    results: TmdbMovie[];
    total_pages: number;
    total_results: number;
}

export interface TmdbTvSearchResponse {
    page: number;
    results: TmdbTvShow[];
    total_pages: number;
    total_results: number;
}

@Injectable()
export class TmdbService {
    private readonly logger = new Logger(TmdbService.name);
    private readonly apiKey = process.env.TMDB_API_KEY;
    private readonly baseUrl = 'https://api.themoviedb.org/3';
    private readonly imageBaseUrl = 'https://image.tmdb.org/t/p';
    // Primary language for TMDB API requests
    private readonly primaryLanguage = process.env.TMDB_LANGUAGE || 'en-US';

    // Languages to fetch for translations (priority order)
    private readonly translationLanguages = ['en-US', 'ru-RU', 'uk-UA'];

    constructor(
        private readonly embeddingsService: EmbeddingsService,
        @Optional() private readonly importProgressService?: ImportProgressService,
    ) {}

    onModuleInit() {
        if (!this.apiKey) {
            throw new Error('TMDB_API_KEY is not set in environment variables');
        }
    }

    /**
     * Search movies by query string
     */
    async searchMovies(query: string, page = 1): Promise<TmdbSearchResponse> {
        try {
            const response = await axios.get<TmdbSearchResponse>(
                `${this.baseUrl}/search/movie`,
                {
                    params: {
                        api_key: this.apiKey,
                        query,
                        page,
                        language: this.primaryLanguage,
                    },
                    timeout: 10000,
                }
            );
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error searching movies: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Search TV shows by query string
     */
    async searchTV(query: string, page = 1): Promise<TmdbTvSearchResponse> {
        try {
            const response = await axios.get<TmdbTvSearchResponse>(
                `${this.baseUrl}/search/tv`,
                {
                    params: {
                        api_key: this.apiKey,
                        query,
                        page,
                        language: this.primaryLanguage,
                    },
                    timeout: 10000,
                }
            );
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error searching TV: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get movie details
     */
    async getMovieDetails(id: number): Promise<TmdbMovieDetails> {
        try {
            const response = await axios.get<TmdbMovieDetails>(
                `${this.baseUrl}/movie/${id}`,
                {
                    params: {
                        api_key: this.apiKey,
                        language: this.primaryLanguage,
                    },
                    timeout: 10000,
                }
            );
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error getting movie details: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get TV details
     */
    async getTVDetails(id: number): Promise<TmdbTvDetails> {
        try {
            const response = await axios.get<TmdbTvDetails>(
                `${this.baseUrl}/tv/${id}`,
                {
                    params: {
                        api_key: this.apiKey,
                        language: this.primaryLanguage,
                    },
                    timeout: 10000,
                }
            );
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error getting TV details: ${errorMessage}`);
            throw error;
        }
    }

    async getTVSeason(tvId: number, seasonNumber: number): Promise<TmdbSeasonDetails> {
        try {
            const response = await axios.get<TmdbSeasonDetails>(
                `${this.baseUrl}/tv/${tvId}/season/${seasonNumber}`,
                {
                    params: {
                        api_key: this.apiKey,
                        language: this.primaryLanguage,
                    },
                    timeout: 10000,
                }
            );
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error getting TV season: ${errorMessage}`);
            throw error;
        }
    }

    async getPopularMovies(page = 1): Promise<TmdbSearchResponse> {
        return this.getMoviesByCategory('popular', page);
    }

    async getPopularTV(page = 1): Promise<TmdbTvSearchResponse> {
        return this.getTVByCategory('popular', page);
    }


    /**
     * Get top rated movies
     */
    async getTopRatedMovies(page = 1): Promise<TmdbSearchResponse> {
        return this.getMoviesByCategory('top_rated', page);
    }

    /**
     * Get upcoming movies
     */
    async getUpcomingMovies(page = 1): Promise<TmdbSearchResponse> {
        return this.getMoviesByCategory('upcoming', page);
    }

    /**
     * Get now playing movies
     */
    async getNowPlayingMovies(page = 1): Promise<TmdbSearchResponse> {
        return this.getMoviesByCategory('now_playing', page);
    }

    /**
     * Generic method to fetch movies by category
     */
    private async getMoviesByCategory(category: string, page = 1): Promise<TmdbSearchResponse> {
        try {
            const response = await axios.get<TmdbSearchResponse>(
                `${this.baseUrl}/movie/${category}`,
                {
                    params: {
                        api_key: this.apiKey,
                        page,
                        language: this.primaryLanguage,
                    },
                    timeout: 10000,
                }
            );

            this.logger.log(`Fetched ${response.data.results.length} ${category} movies (page ${page})`);
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error fetching ${category} movies: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Generic method to fetch TV by category
     */
    private async getTVByCategory(category: string, page = 1): Promise<TmdbTvSearchResponse> {
        try {
            const response = await axios.get<TmdbTvSearchResponse>(
                `${this.baseUrl}/tv/${category}`,
                {
                    params: {
                        api_key: this.apiKey,
                        page,
                        language: this.primaryLanguage,
                    },
                    timeout: 10000,
                }
            );

            this.logger.log(`Fetched ${response.data.results.length} ${category} TV shows (page ${page})`);
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error fetching ${category} TV shows: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Fetch movie translations in multiple languages
     */
    async getMovieTranslations(movieId: number): Promise<Record<string, any>> {
        const translations: Record<string, any> = {};

        this.logger.log(`🌐 Fetching translations for movie ${movieId} in languages: ${this.translationLanguages.join(', ')}`);

        for (const lang of this.translationLanguages) {
            try {
                const response = await axios.get<TmdbMovieDetails>(
                    `${this.baseUrl}/movie/${movieId}`,
                    {
                        params: {
                            api_key: this.apiKey,
                            language: lang,
                        },
                        timeout: 10000,
                    }
                );

                const data = response.data;
                const langCode = lang.split('-')[0]; // 'en-US' -> 'en', 'ru-RU' -> 'ru'

                translations[langCode] = {
                    title: data.title,
                    description: data.overview || null,
                    tagline: data.tagline || null,
                    poster_url: data.poster_path ? `${this.imageBaseUrl}/w500${data.poster_path}` : null,
                    backdrop_url: data.backdrop_path ? `${this.imageBaseUrl}/original${data.backdrop_path}` : null,
                };

                this.logger.log(`✅ Fetched ${langCode} translation for movie ${movieId}: "${data.title}"`);

                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`❌ Could not fetch ${lang} translation for movie ${movieId}: ${errorMessage}`);
            }
        }

        this.logger.log(`📦 Returning ${Object.keys(translations).length} translations for movie ${movieId}`);
        return translations;
    }

    /**
     * Fetch TV show translations in multiple languages
     */
    async getTvTranslations(tvId: number): Promise<Record<string, any>> {
        const translations: Record<string, any> = {};

        this.logger.log(`🌐 Fetching translations for TV ${tvId} in languages: ${this.translationLanguages.join(', ')}`);

        for (const lang of this.translationLanguages) {
            try {
                const response = await axios.get<TmdbTvDetails>(
                    `${this.baseUrl}/tv/${tvId}`,
                    {
                        params: {
                            api_key: this.apiKey,
                            language: lang,
                        },
                        timeout: 10000,
                    }
                );

                const data = response.data;
                const langCode = lang.split('-')[0]; // 'en-US' -> 'en'

                translations[langCode] = {
                    name: data.name,
                    overview: data.overview || null,
                    tagline: data.tagline || null,
                    poster_url: data.poster_path ? `${this.imageBaseUrl}/w500${data.poster_path}` : null,
                    backdrop_url: data.backdrop_path ? `${this.imageBaseUrl}/original${data.backdrop_path}` : null,
                };

                this.logger.log(`✅ Fetched ${langCode} translation for TV ${tvId}: "${data.name}"`);

                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`❌ Could not fetch ${lang} translation for TV ${tvId}: ${errorMessage}`);
            }
        }

        this.logger.log(`📦 Returning ${Object.keys(translations).length} translations for TV ${tvId}`);
        return translations;
    }

    /**
     * Get movie keywords from TMDB
     */
    async getMovieKeywords(movieId: number): Promise<string[]> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/movie/${movieId}/keywords`,
                {
                    params: {
                        api_key: this.apiKey,
                    },
                    timeout: 10000,
                }
            );

            const keywords = response.data.keywords || [];
            return keywords.map((k: any) => k.name);
        } catch (error) {
            this.logger.warn(`Could not fetch keywords for movie ${movieId}`);
            return [];
        }
    }

    /**
     * Get movie credits (cast + crew) from TMDB
     */
    async getMovieCredits(movieId: number): Promise<{
        cast: any[];
        crew: any[];
    }> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/movie/${movieId}/credits`,
                {
                    params: {
                        api_key: this.apiKey,
                    },
                    timeout: 10000,
                }
            );

            return {
                // Top 5 cast members
                cast: (response.data.cast || []).slice(0, 5).map((c: any) => ({
                    name: c.name,
                    character: c.character,
                    profile_path: c.profile_path,
                })),
                // Key crew: Director, Screenplay, Story
                crew: (response.data.crew || [])
                    .filter((c: any) =>
                        ['Director', 'Screenplay', 'Story'].includes(c.job)
                    )
                    .map((c: any) => ({
                        name: c.name,
                        job: c.job,
                        department: c.department,
                    })),
            };
        } catch (error) {
            this.logger.warn(`Could not fetch credits for movie ${movieId}`);
            return { cast: [], crew: [] };
        }
    }

    /**
     * Get TV keywords from TMDB
     */
    async getTvKeywords(tvId: number): Promise<string[]> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/tv/${tvId}/keywords`,
                { params: { api_key: this.apiKey }, timeout: 10000 }
            );
            return (response.data.results || []).map((k: any) => k.name);
        } catch (error) {
            this.logger.warn(`Could not fetch keywords for TV ${tvId}`);
            return [];
        }
    }

    /**
     * Get TV credits
     */
    async getTvCredits(tvId: number): Promise<{ cast: any[]; crew: any[] }> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/tv/${tvId}/credits`,
                { params: { api_key: this.apiKey }, timeout: 10000 }
            );
            return {
                cast: (response.data.cast || []).slice(0, 5).map((c: any) => ({
                    name: c.name,
                    character: c.character,
                    profile_path: c.profile_path,
                })),
                crew: (response.data.crew || []).slice(0, 5).map((c: any) => ({
                    name: c.name,
                    job: c.job,
                    department: c.department,
                })),
            };
        } catch (error) {
            this.logger.warn(`Could not fetch credits for TV ${tvId}`);
            return { cast: [], crew: [] };
        }
    }

    /**
     * Import TV Show to DB with translations
     */
    async importTvShowToDb(tvId: number, background: boolean = true): Promise<TvShowInsert> {
        try {
            const tmdbTv = await this.getTVDetails(tvId);
            const [keywords, credits, translations] = await Promise.all([
                this.getTvKeywords(tvId),
                this.getTvCredits(tvId),
                this.getTvTranslations(tvId),
            ]);

            const tvData: TvShowInsert = {
                id: tmdbTv.id,
                name: tmdbTv.name,
                overview: tmdbTv.overview || null,
                poster_url: tmdbTv.poster_path ? `${this.imageBaseUrl}/w500${tmdbTv.poster_path}` : null,
                backdrop_url: tmdbTv.backdrop_path ? `${this.imageBaseUrl}/original${tmdbTv.backdrop_path}` : null,
                genres: tmdbTv.genres?.map((g) => g.name) || null,
                first_air_date: tmdbTv.first_air_date || null,
                last_air_date: tmdbTv.last_air_date || null,
                vote_average: tmdbTv.vote_average || null,
                vote_count: tmdbTv.vote_count || null,
                popularity: tmdbTv.popularity || null,
                number_of_seasons: tmdbTv.number_of_seasons || null,
                number_of_episodes: tmdbTv.number_of_episodes || null,
                original_language: tmdbTv.original_language || null,
                origin_country: tmdbTv.origin_country || null,
                status: tmdbTv.status || null,
                keywords: keywords.length > 0 ? keywords : null,
                tagline: tmdbTv.tagline || null,
                tv_cast: credits.cast.length > 0 ? JSON.stringify(credits.cast) : null,
                crew: credits.crew.length > 0 ? JSON.stringify(credits.crew) : null,
                production_companies: tmdbTv.production_companies?.map((c: any) => c.name) || null,
                embedding: null,
                translations: translations as any, // 🆕 Store translations for multiple languages
            };

            const { data, error } = await supabase
                .from('tv_shows')
                .upsert(tvData as any, { onConflict: 'id' })
                .select()
                .single();

            if (error) throw error;

            this.logger.log(`✅ Imported TV Show: ${tvData.name} (ID: ${tvData.id})`);

            // Define background tasks logic
            const performBackgroundTasks = async () => {
                try {
                    // Import seasons and episodes
                    if (tvData.number_of_seasons && tvData.number_of_seasons > 0) {
                        await this.importTvSeasons(tvData.id, tvData.number_of_seasons);
                    }

                    // Generate embedding for the new TV Show
                    await this.embeddingsService.generateTvShowEmbedding(tvData.id);
                } catch (e) {
                    const bgError = e instanceof Error ? e.message : String(e);
                    this.logger.error(`Background task failed for TV ${tvData.id}: ${bgError}`);
                }
            };

            // Execute based on background flag
            if (background) {
                performBackgroundTasks(); // Fire and forget
            } else {
                await performBackgroundTasks(); // Wait for completion
            }

            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error importing TV Show ${tvId}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Import seasons and episodes for a TV Show
     */
    async importTvSeasons(tvId: number, seasonsCount: number): Promise<void> {
        this.logger.log(`Importing ${seasonsCount} seasons for TV Show ${tvId}...`);

        // Loop through seasons. Start from 1.
        for (let i = 1; i <= seasonsCount; i++) {
            try {
                const seasonData = await this.getTVSeason(tvId, i);

                if (!seasonData) continue;

                // Insert Season
                const seasonInsert: TvSeasonInsert = {
                    id: seasonData.id,
                    tv_show_id: tvId,
                    season_number: seasonData.season_number,
                    name: seasonData.name,
                    overview: seasonData.overview,
                    poster_url: seasonData.poster_path ? `${this.imageBaseUrl}/w500${seasonData.poster_path}` : null,
                    air_date: seasonData.air_date,
                    episode_count: seasonData.episodes?.length || 0,
                    vote_average: seasonData.vote_average
                };

                const { error: seasonError } = await supabase
                    .from('tv_seasons')
                    .upsert(seasonInsert as any, { onConflict: 'id' });

                if (seasonError) {
                    this.logger.error(`Error saving season ${i} for TV ${tvId}: ${seasonError.message}`);
                    continue;
                }

                // Prepare Episodes
                if (seasonData.episodes && seasonData.episodes.length > 0) {
                    const episodesInsert: TvEpisodeInsert[] = seasonData.episodes.map(ep => ({
                        id: ep.id,
                        tv_show_id: tvId,
                        season_id: seasonData.id,
                        episode_number: ep.episode_number,
                        name: ep.name,
                        overview: ep.overview,
                        still_url: ep.still_path ? `${this.imageBaseUrl}/original${ep.still_path}` : null,
                        air_date: ep.air_date,
                        vote_average: ep.vote_average,
                        vote_count: ep.vote_count,
                        runtime: ep.runtime
                    }));

                    const { error: episodesError } = await supabase
                        .from('tv_episodes')
                        .upsert(episodesInsert as any, { onConflict: 'id' });
                    
                    if (episodesError) {
                         this.logger.error(`Error saving episodes for season ${i} TV ${tvId}: ${episodesError.message}`);
                    }
                }

                this.logger.log(`Imported Season ${i}/${seasonsCount} for TV ${tvId}`);

                // Rate limit protection
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (e) {
                this.logger.warn(`Failed to import season ${i} for TV ${tvId}: ${e}`);
            }
        }
    }

    /**
     * Import movie from TMDB to our database with translations
     */
    async importMovieToDb(movieId: number): Promise<MovieInsert> {
        try {
            // 1. Get full movie details from TMDB
            const tmdbMovie = await this.getMovieDetails(movieId);
            const [keywords, credits, translations] = await Promise.all([
                this.getMovieKeywords(movieId),
                this.getMovieCredits(movieId),
                this.getMovieTranslations(movieId),
            ]);

            // 2. Transform TMDB data to our database format
            const movieData: MovieInsert = {
                id: tmdbMovie.id,
                title: tmdbMovie.title,
                description: tmdbMovie.overview || null,
                poster_url: tmdbMovie.poster_path
                    ? `${this.imageBaseUrl}/w500${tmdbMovie.poster_path}`
                    : null,
                backdrop_url: tmdbMovie.backdrop_path
                    ? `${this.imageBaseUrl}/original${tmdbMovie.backdrop_path}`
                    : null,
                genres: tmdbMovie.genres?.map((g) => g.name) || null,
                release_date: tmdbMovie.release_date || null,
                vote_average: tmdbMovie.vote_average || null,
                vote_count: tmdbMovie.vote_count || null,
                popularity: tmdbMovie.popularity || null,
                runtime: tmdbMovie.runtime || null,
                original_language: tmdbMovie.original_language || null,
                // embedding will be generated later (Day 4)
                embedding: null,
                keywords: keywords.length > 0 ? keywords : null,
                tagline: tmdbMovie.tagline || null,
                movie_cast: credits.cast.length > 0 ? JSON.stringify(credits.cast) : null,
                crew: credits.crew.length > 0 ? JSON.stringify(credits.crew) : null,
                production_companies: tmdbMovie.production_companies?.map((c: any) => c.name) || null,
                translations: translations as any, // 🆕 Store translations for multiple languages
            };

            // 3. Insert or update in database
            const { data, error } = await supabase
                .from('movies')
                .upsert(movieData as any, { onConflict: 'id' })
                .select()
                .single();

            if (error) {
                this.logger.error(`Error inserting movie to DB: ${error.message}`);
                throw error;
            }

            this.logger.log(`✅ Imported movie: ${movieData.title} (ID: ${movieData.id})`);
            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error importing movie ${movieId}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * @deprecated Use importMovies instead
     */
    async importPopularMovies(count: number, startPage = 1): Promise<{ imported: number; skipped: number }> {
        return this.importMovies('popular', count, startPage);
    }

    /**
     * Get movies by specific year using discover endpoint
     */
    async getMoviesByYear(year: number, page = 1): Promise<TmdbSearchResponse> {
        try {
            const response = await axios.get<TmdbSearchResponse>(
                `${this.baseUrl}/discover/movie`,
                {
                    params: {
                        api_key: this.apiKey,
                        primary_release_year: year,
                        sort_by: 'popularity.desc',
                        page,
                        language: this.primaryLanguage,
                    },
                }
            );

            this.logger.log(`Fetched ${response.data.results.length} movies for year ${year} (page ${page})`);
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error fetching movies for year ${year}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Import movies for a specific year
     */
    async importMoviesByYear(year: number, count: number): Promise<{ imported: number; skipped: number }> {
        try {
            this.logger.log(`Importing ${count} movies from year ${year}`);

            let imported = 0;
            let skipped = 0;
            const moviesPerPage = 20;
            const totalPages = Math.ceil(count / moviesPerPage);

            for (let page = 1; page <= totalPages; page++) {
                const response = await this.getMoviesByYear(year, page);
                const movies = response.results.slice(0, count - (imported + skipped));

                for (const movie of movies) {
                    try {
                        await this.importMovieToDb(movie.id);
                        imported++;
                    } catch (error) {
                        skipped++;
                    }
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                if (imported + skipped >= count) break;
            }

            this.logger.log(`Year ${year} complete: ${imported} imported, ${skipped} skipped`);

            // Generate embeddings for newly imported movies
            if (imported > 0) {
                this.logger.log(`🧠 Generating embeddings for ${imported} new movies...`);
                await this.embeddingsService.generateAllMissingEmbeddings();
            }

            return { imported, skipped };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Import movies for year ${year} error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Import movies for a specific year and generate embeddings
     */
    async importMoviesByYearWithEmbeddings(year: number, count: number): Promise<{ imported: number; skipped: number }> {
        const result = await this.importMoviesByYear(year, count);
        await this.embeddingsService.generateAllMissingEmbeddings();
        return result;
    }

    /**
     * Get TV shows by specific year using discover endpoint
     */
    async getTvShowsByYear(year: number, page = 1): Promise<TmdbTvSearchResponse> {
        try {
            const response = await axios.get<TmdbTvSearchResponse>(
                `${this.baseUrl}/discover/tv`,
                {
                    params: {
                        api_key: this.apiKey,
                        first_air_date_year: year,
                        sort_by: 'popularity.desc',
                        page,
                        language: this.primaryLanguage,
                    },
                }
            );

            this.logger.log(`Fetched ${response.data.results.length} TV shows for year ${year} (page ${page})`);
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error fetching TV shows for year ${year}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Import TV shows for a specific year with progress tracking
     */
    async importTvShowsByYear(year: number, count: number, startPage?: number): Promise<{ imported: number; skipped: number; lastPage: number }> {
        try {
            // Get next page from progress tracker if startPage not provided
            const nextPage = startPage || (this.importProgressService
                ? await this.importProgressService.getNextPage('tv_shows', 'by_year', year)
                : 1);

            this.logger.log(`Importing ${count} TV shows from year ${year} (starting page: ${nextPage})`);

            let imported = 0;
            let skipped = 0;
            const tvShowsPerPage = 20;
            const totalPages = Math.ceil(count / tvShowsPerPage);
            let lastProcessedPage = nextPage - 1;

            for (let page = nextPage; page < nextPage + totalPages; page++) {
                this.logger.debug(`Processing page ${page}...`);

                const response = await this.getTvShowsByYear(year, page);

                if (!response.results || response.results.length === 0) {
                    this.logger.warn(`No more results for year ${year} at page ${page}`);
                    break;
                }

                const tvShows = response.results.slice(0, count - (imported + skipped));
                let pageImported = 0;
                let pageSkipped = 0;

                for (const tvShow of tvShows) {
                    try {
                        // Check if already imported
                        const { data: existing } = await supabase
                            .from('tv_shows')
                            .select('id')
                            .eq('id', tvShow.id)
                            .maybeSingle();

                        if (existing) {
                            pageSkipped++;
                            skipped++;
                            this.logger.debug(`Skipped: ${tvShow.name} (already exists)`);
                        } else {
                            await this.importTvShowToDb(tvShow.id);
                            pageImported++;
                            imported++;
                            this.logger.log(`Imported: ${tvShow.name} (${imported}/${count})`);
                        }
                    } catch (error) {
                        pageSkipped++;
                        skipped++;
                        this.logger.warn(`Failed to import ${tvShow.name}: ${error}`);
                    }
                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                lastProcessedPage = page;

                // Update progress after each page
                if (this.importProgressService) {
                    await this.importProgressService.updateProgress(
                        'tv_shows',
                        'by_year',
                        page,
                        pageImported,
                        pageSkipped,
                        year
                    );
                }

                // If all TV shows on this page were skipped (duplicates),
                // consider moving to next year
                if (pageImported === 0 && pageSkipped > 0) {
                    this.logger.warn(`Page ${page}: All ${pageSkipped} TV shows skipped (duplicates). Consider switching year.`);
                }

                if (imported + skipped >= count) break;
            }

            this.logger.log(`Year ${year} complete: ${imported} imported, ${skipped} skipped, last page: ${lastProcessedPage}`);

            // Generate embeddings for newly imported TV shows
            if (imported > 0) {
                this.logger.log(`🧠 Generating embeddings for ${imported} new TV shows...`);
                await this.embeddingsService.generateAllMissingTvEmbeddings();
            }

            return { imported, skipped, lastPage: lastProcessedPage };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Import TV shows for year ${year} error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Import multiple movies to database by category with progress tracking
     */
    async importMovies(
        category: string,
        count: number,
        startPage?: number
    ): Promise<{ imported: number; skipped: number; lastPage: number }> {
        try {
            // Get next page from progress tracker if startPage not provided
            const nextPage = startPage || (this.importProgressService
                ? await this.importProgressService.getNextPage('movies', category)
                : 1);

            this.logger.log(`Importing ${count} ${category} movies from TMDB (starting page: ${nextPage})`);

            let imported = 0;
            let skipped = 0;
            const moviesPerPage = 20;
            const totalPages = Math.ceil(count / moviesPerPage);
            let lastProcessedPage = nextPage - 1;

            for (let page = nextPage; page < nextPage + totalPages; page++) {
                this.logger.debug(`Processing page ${page}...`);

                const response = await this.getMoviesByCategory(category, page);

                if (!response.results || response.results.length === 0) {
                    this.logger.warn(`No more results for ${category} at page ${page}`);
                    break;
                }

                const movies = response.results.slice(0, count - (imported + skipped));
                let pageImported = 0;
                let pageSkipped = 0;

                for (const movie of movies) {
                    try {
                        // Check if movie already exists before importing
                        const { data: existing } = await supabase
                            .from('movies')
                            .select('id')
                            .eq('id', movie.id)
                            .maybeSingle();

                        if (existing) {
                            pageSkipped++;
                            skipped++;
                            this.logger.debug(`Skipped: ${movie.title} (already exists)`);
                        } else {
                            await this.importMovieToDb(movie.id);
                            pageImported++;
                            imported++;
                            this.logger.log(`Imported: ${movie.title} (${imported}/${count})`);
                        }
                    } catch (error) {
                        pageSkipped++;
                        skipped++;
                        this.logger.warn(`Failed: ${movie.title}`);
                    }

                    // Rate limiting: delay between requests
                    await new Promise(resolve => setTimeout(resolve, 250));
                }

                lastProcessedPage = page;

                // Update progress after each page
                if (this.importProgressService) {
                    await this.importProgressService.updateProgress(
                        'movies',
                        category,
                        page,
                        pageImported,
                        pageSkipped
                    );
                }

                // If all movies on this page were skipped (duplicates),
                // consider moving to next category/year
                if (pageImported === 0 && pageSkipped > 0) {
                    this.logger.warn(`Page ${page}: All ${pageSkipped} movies skipped (duplicates). Consider switching category/year.`);
                }

                if (imported + skipped >= count) break;
            }

            this.logger.log(`Import complete: ${imported} imported, ${skipped} skipped, last page: ${lastProcessedPage}`);

            // Generate embeddings for newly imported movies
            if (imported > 0) {
                await this.embeddingsService.generateAllMissingEmbeddings();
            }

            return { imported, skipped, lastPage: lastProcessedPage };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Import ${category} movies error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Import TV shows by category with progress tracking
     */
    async importTvShows(
        category: string,
        count: number,
        startPage?: number
    ): Promise<{ imported: number; skipped: number; lastPage: number }> {
        try {
            // Get next page from progress tracker if startPage not provided
            const nextPage = startPage || (this.importProgressService
                ? await this.importProgressService.getNextPage('tv_shows', category)
                : 1);

            this.logger.log(`Importing ${count} ${category} TV shows from TMDB (starting page: ${nextPage})`);

            let imported = 0;
            let skipped = 0;
            const tvShowsPerPage = 20;
            const totalPages = Math.ceil(count / tvShowsPerPage);
            let lastProcessedPage = nextPage - 1;

            for (let page = nextPage; page < nextPage + totalPages; page++) {
                this.logger.debug(`Processing page ${page}...`);

                const response = await this.getTVByCategory(category, page);

                if (!response.results || response.results.length === 0) {
                    this.logger.warn(`No more results for ${category} TV shows at page ${page}`);
                    break;
                }

                const tvShows = response.results.slice(0, count - (imported + skipped));
                let pageImported = 0;
                let pageSkipped = 0;

                for (const tvShow of tvShows) {
                    try {
                        // Check if TV show already exists before importing
                        const { data: existing } = await supabase
                            .from('tv_shows')
                            .select('id')
                            .eq('id', tvShow.id)
                            .maybeSingle();

                        if (existing) {
                            pageSkipped++;
                            skipped++;
                            this.logger.debug(`Skipped: ${tvShow.name} (already exists)`);
                        } else {
                            await this.importTvShowToDb(tvShow.id);
                            pageImported++;
                            imported++;
                            this.logger.log(`Imported: ${tvShow.name} (${imported}/${count})`);
                        }
                    } catch (error) {
                        pageSkipped++;
                        skipped++;
                        this.logger.warn(`Failed: ${tvShow.name}`);
                    }

                    // Rate limiting: delay between requests
                    await new Promise(resolve => setTimeout(resolve, 250));
                }

                lastProcessedPage = page;

                // Update progress after each page
                if (this.importProgressService) {
                    await this.importProgressService.updateProgress(
                        'tv_shows',
                        category,
                        page,
                        pageImported,
                        pageSkipped
                    );
                }

                // If all TV shows on this page were skipped (duplicates),
                // consider moving to next category
                if (pageImported === 0 && pageSkipped > 0) {
                    this.logger.warn(`Page ${page}: All ${pageSkipped} TV shows skipped (duplicates). Consider switching category.`);
                }

                if (imported + skipped >= count) break;
            }

            this.logger.log(`TV import complete: ${imported} imported, ${skipped} skipped, last page: ${lastProcessedPage}`);

            // Generate embeddings for newly imported TV shows
            if (imported > 0) {
                await this.embeddingsService.generateAllMissingTvEmbeddings();
            }

            return { imported, skipped, lastPage: lastProcessedPage };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Import ${category} TV shows error: ${errorMessage}`);
            throw error;
        }
    }
}
