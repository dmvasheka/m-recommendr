import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { supabase } from '@repo/db';
import type { MovieInsert } from '@repo/db';

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
}

export interface TmdbSearchResponse {
    page: number;
    results: TmdbMovie[];
    total_pages: number;
    total_results: number;
}

@Injectable()
export class TmdbService {
    private readonly logger = new Logger(TmdbService.name);
    private readonly apiKey = process.env.TMDB_API_KEY;
    private readonly baseUrl = 'https://api.themoviedb.org/3';
    private readonly imageBaseUrl = 'https://image.tmdb.org/t/p';

    constructor() {
        if (!this.apiKey) {
            this.logger.error('TMDB_API_KEY is not set in environment variables');
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
                        language: 'en-US',
                    },
                }
            );

            this.logger.log(`Searched for "${query}", found ${response.data.total_results} results`);
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error searching movies: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get movie details by TMDB ID
     */
    async getMovieDetails(movieId: number): Promise<TmdbMovieDetails> {
        try {
            const response = await axios.get<TmdbMovieDetails>(
                `${this.baseUrl}/movie/${movieId}`,
                {
                    params: {
                        api_key: this.apiKey,
                        language: 'en-US',
                    },
                }
            );

            this.logger.log(`Fetched details for movie ID ${movieId}: ${response.data.title}`);
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error fetching movie details: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get popular movies
     */
    async getPopularMovies(page = 1): Promise<TmdbSearchResponse> {
        try {
            const response = await axios.get<TmdbSearchResponse>(
                `${this.baseUrl}/movie/popular`,
                {
                    params: {
                        api_key: this.apiKey,
                        page,
                        language: 'en-US',
                    },
                }
            );

            this.logger.log(`Fetched ${response.data.results.length} popular movies (page ${page})`);
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error fetching popular movies: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Import movie from TMDB to our database
     */
    async importMovieToDb(movieId: number): Promise<MovieInsert> {
        try {
            // 1. Get full movie details from TMDB
            const tmdbMovie = await this.getMovieDetails(movieId);

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
     * Import multiple popular movies to database
     */
    async importPopularMovies(count: number, startPage = 1): Promise<{ imported: number; skipped: number }> {
        try {
            this.logger.log(`Importing ${count} popular movies from TMDB (starting page: ${startPage})`);

            let imported = 0;
            let skipped = 0;
            const moviesPerPage = 20;
            const totalPages = Math.ceil(count / moviesPerPage);

            for (let page = startPage; page < startPage + totalPages; page++) {
                const response = await axios.get(
                    `${this.baseUrl}/movie/popular`,
                    {
                        params: {
                            api_key: this.apiKey,
                            page,
                        },
                    }
                );

                const movies = response.data.results.slice(0, count - (imported + skipped));

                for (const movie of movies) {
                    try {
                        await this.importMovieToDb(movie.id);
                        imported++;
                        this.logger.log(`Imported: ${movie.title} (${imported}/${count})`);
                    } catch (error) {
                        skipped++;
                        this.logger.warn(`Skipped: ${movie.title} (already exists or error)`);
                    }

                    // Rate limiting: небольшая задержка между запросами
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                if (imported + skipped >= count) break;
            }

            this.logger.log(`Import complete: ${imported} imported, ${skipped} skipped`);
            return { imported, skipped }; // 👈 Возвращаем результат
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Import popular movies error: ${errorMessage}`);
            throw error;
        }
    }
}

