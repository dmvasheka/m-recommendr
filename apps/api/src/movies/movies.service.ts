import { Injectable, Logger } from '@nestjs/common';
import { supabase } from '@repo/db';
import { generateEmbedding } from '@repo/ai';
import type { Movie } from '@repo/db';
import { RedisService } from '../redis/redis.service';

export interface SearchResult extends Omit<Movie, 'embedding'> {
    similarity: number;
}

@Injectable()
export class MoviesService {
    private readonly logger = new Logger(MoviesService.name);
    constructor(private readonly redisService: RedisService) {}

    /**
     * Semantic search - find movies by query text
     */
    async searchMovies(query: string, limit = 10): Promise<SearchResult[]> {
        try {
            this.logger.log(`Searching for: "${query}"`);

            const cacheKey = `search:${query.toLowerCase()}:${limit}`;
            const cached = await this.redisService.get<SearchResult[]>(cacheKey);

            if (cached) {
                this.logger.log(`✅ Cache HIT for "${query}"`);
                return cached;
            }

            this.logger.log(`❌ Cache MISS for "${query}" - generating...`);

            // 1. Generate embedding for search query
            const queryEmbedding = await generateEmbedding(query);

            // 2. Use Supabase RPC to call match_movies function
            const { data, error } = await (supabase.rpc as any)('match_movies', {
                query_embedding: JSON.stringify(queryEmbedding),
                match_count: limit,
            });

            if (error) {
                throw error;
            }

            const results = data as SearchResult[] | null;
            this.logger.log(`Found ${results?.length || 0} results`);
            if (results && results.length > 0) {
                await this.redisService.set(cacheKey, results, 3600);
                this.logger.log(`💾 Cached results for "${query}"`);
            }

            return results || [];
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message :
                String(error);
            this.logger.error(`Search error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Find similar movies by movie ID
     */
    async getSimilarMovies(movieId: number, limit = 10): Promise<SearchResult[]> {
        try {
            this.logger.log(`Finding similar movies to ${movieId}`);

            // Use Supabase RPC to call get_similar_movies function
            const { data, error } = await (supabase.rpc as
                any)('get_similar_movies', {
                p_movie_id: movieId,
                match_count: limit,
            });

            if (error) {
                throw error;
            }

            const results = data as SearchResult[] | null;
            this.logger.log(`Found ${results?.length || 0} similar movies`);
            return results || [];
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message :
                String(error);
            this.logger.error(`Similar movies error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get movie by ID
     */
    async getMovieById(movieId: number): Promise<Movie | null> {
        try {
            const { data, error } = await supabase
                .from('movies')
                .select('*')
                .eq('id', movieId)
                .single();

            if (error) {
                throw error;
            }

            return data as Movie;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message :
                String(error);
            this.logger.error(`Get movie error: ${errorMessage}`);
            return null;
        }
    }

    /**
     * Get all movies with pagination
     */
    async getAllMovies(page = 1, pageSize = 20): Promise<{ movies: Movie[]; total:
            number }> {
        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            // Get total count
            const { count } = await supabase
                .from('movies')
                .select('*', { count: 'exact', head: true });

            // Get paginated movies
            const { data, error } = await supabase
                .from('movies')
                .select('id, title, description, poster_url, genres, vote_average, popularity, release_date')
                .order('popularity', { ascending: false })
                .range(from, to);

            if (error) {
                throw error;
            }

            return {
                movies: (data as Movie[]) || [],
                total: count || 0,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message :
                String(error);
            this.logger.error(`Get all movies error: ${errorMessage}`);
            throw error;
        }
    }
    /**
     * Find movies similar to multiple movies combined
     * @param movieIds - Array of movie IDs to combine
     * @param limit - Number of results to return
     */
    async getSimilarToMultiple(movieIds: number[], limit = 10): Promise<SearchResult[]> {
        try {
            this.logger.log(`Finding movies similar to combination of: [${movieIds.join(', ')}]`);

            if (!movieIds || movieIds.length === 0) {
                throw new Error('At least one movie ID is required');
            }

            // 1. Fetch embeddings for all specified movies
            const { data: movies, error: fetchError } = await supabase
                .from('movies')
                .select('id, title, embedding')
                .in('id', movieIds);

            if (fetchError) {
                throw fetchError;
            }

            if (!movies || movies.length === 0) {
                throw new Error('No movies found with specified IDs');
            }

            // Filter out movies without embeddings
            const moviesWithEmbeddings = movies.filter((m: any) => m.embedding);

            if (moviesWithEmbeddings.length === 0) {
                throw new Error('None of the specified movies have embeddings');
            }

            this.logger.log(`Found ${moviesWithEmbeddings.length} movies with embeddings`);

            // 2. Parse embeddings (stored as JSON strings) and average them
            const embeddings = moviesWithEmbeddings.map((m: any) =>
                JSON.parse(m.embedding) as number[]
            );

            // Calculate average embedding
            const embeddingLength = embeddings[0].length; // Should be 1536
            const averageEmbedding = new Array(embeddingLength).fill(0);

            for (const embedding of embeddings) {
                for (let i = 0; i < embeddingLength; i++) {
                    averageEmbedding[i] += embedding[i];
                }
            }

            for (let i = 0; i < embeddingLength; i++) {
                averageEmbedding[i] /= embeddings.length;
            }

            this.logger.log(`Computed average embedding from ${embeddings.length} movies`);

            // 3. Use averaged embedding to find similar movies via match_movies RPC
            const { data, error } = await (supabase.rpc as any)('match_movies', {
                query_embedding: JSON.stringify(averageEmbedding),
                match_count: limit + movieIds.length, // Fetch extra to exclude input movies
            });

            if (error) {
                throw error;
            }

            const results = (data as SearchResult[] | null) || [];

            // 4. Filter out the input movies from results
            const filtered = results.filter((r: SearchResult) => !movieIds.includes(r.id));

            this.logger.log(`Found ${filtered.length} similar movies (after filtering input)`);

            return filtered.slice(0, limit);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Multi-movie similarity error: ${errorMessage}`);
            throw error;
        }
    }

}
