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
    async searchTvShows(query: string, limit = 10): Promise<TvShowSearchResult[]> {
        try {
            this.logger.log(`Searching TV shows for: "${query}"`);

            const cacheKey = `tv_search:${query.toLowerCase()}:${limit}`;
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

            const results = data as TvShowSearchResult[] | null;
            this.logger.log(`Found ${results?.length || 0} results`);
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
    async getTvShowById(tvShowId: number) {
        try {
            const { data, error } = await supabase
                .from('tv_shows')
                .select('*')
                .eq('id', tvShowId)
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get TV show error: ${errorMessage}`);
            return null;
        }
    }

    /**
     * Get all TV shows with pagination
     */
    async getAllTvShows(page = 1, pageSize = 20) {
        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            // Get total count
            const { count } = await supabase
                .from('tv_shows')
                .select('*', { count: 'exact', head: true });

            // Get paginated TV shows
            const { data, error } = await supabase
                .from('tv_shows')
                .select('id, name, overview, poster_url, genres, vote_average, popularity, first_air_date')
                .order('popularity', { ascending: false })
                .range(from, to);

            if (error) {
                throw error;
            }

            return {
                tvShows: data || [],
                total: count || 0,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get all TV shows error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Fast prefix/substring search for autocomplete
     */
    async autocomplete(query: string, limit = 10) {
        try {
            // Sanitize query: escape special LIKE characters and trim
            const sanitizedQuery = query
                .replace(/[%_]/g, '\\$&')
                .trim();

            if (!sanitizedQuery) {
                return [];
            }

            this.logger.log(`Autocomplete TV for: "${sanitizedQuery}"`);

            // Search by name using ilike (case-insensitive substring)
            const { data, error } = await supabase
                .from('tv_shows')
                .select('id, name, poster_url, first_air_date, vote_average')
                .ilike('name', `%${sanitizedQuery}%`)
                .order('popularity', { ascending: false })
                .limit(limit);

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Autocomplete TV error: ${errorMessage}`);
            throw error;
        }
    }
}
