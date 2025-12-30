import { Injectable, Logger } from '@nestjs/common';
import { supabase } from '@repo/db';
import { RedisService } from '../redis/redis.service';

export interface RecommendationResult {
    id: number;
    title: string;
    description: string | null;
    poster_url: string | null;
    backdrop_url: string | null;
    genres: string[] | null;
    vote_average: number | null;
    popularity: number | null;
    similarity: number;
}

@Injectable()
export class RecommendationsService {
    private readonly logger = new Logger(RecommendationsService.name);
    constructor(private readonly redisService: RedisService) {}
    /**
     * Get personalized recommendations for a user
     * Uses the user's profile embedding (calculated from
     watched movies)
     */
    async getPersonalizedRecommendations(
        userId: string,
        limit = 10,
    ): Promise<RecommendationResult[]> {
        try {
            this.logger.log(`Getting personalized recommendations for user ${userId}`);

            const cacheKey = `recommendations:${userId}:${limit}`;
            const cached = await this.redisService.get<RecommendationResult[]>(cacheKey);

            if (cached) {
                this.logger.log(`✅ Cache HIT for user ${userId}`);
                return cached;
            }

            this.logger.log(`❌ Cache MISS for user ${userId} - generating...`);

            // Check if user has a profile embedding
            const { data: profile, error: profileError } = await (supabase as any)
                    .from('user_profiles')
                    .select('prefs_embedding')
                    .eq('user_id', userId)
                    .single();

            if (profileError || !profile || !profile.prefs_embedding)
            {
                this.logger.warn(
                    `User ${userId} has no profile embedding yet. Need to watch and rate movies first.`,
                );
                return [];
            }

            // Use SQL function to get recommendations based on user profile
            const { data, error } = await (supabase.rpc as any)('match_movies_by_profile', {
                p_user_id: userId,
                match_count: limit,
            });

            if (error) {
                throw error;
            }

            const results = data as RecommendationResult[] | null;

            if (results && results.length > 0) {
                await this.redisService.set(cacheKey, results, 600);
                this.logger.log(`💾 Cached recommendations for user ${userId}`);
            }

            this.logger.log(`Found ${results?.length || 0}
   personalized recommendations`);
            return results || [];
        } catch (error) {
            const errorMessage = error instanceof Error ?
                error.message : String(error);
            this.logger.error(`Get recommendations error: 
  ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Manually trigger user profile embedding update
     * Usually this happens automatically via database
     trigger
     */
    async updateUserProfile(userId: string, minRating =
    7): Promise<void> {
        try {
            this.logger.log(`Updating user profile for ${userId} (min rating: ${minRating})`);

            const { error } = await (supabase.rpc as
                any)('update_user_profile_embedding', {
                p_user_id: userId,
                min_rating: minRating,
            });

            if (error) {
                throw error;
            }

            this.logger.log(`User profile updated successfully`);
            const pattern = `recommendations:${userId}:*`;
            const keys = await this.redisService.keys(pattern);
            for (const key of keys) {
                await this.redisService.del(key);
            }
            this.logger.log(`🗑️  Invalidated ${keys.length} cache keys for user ${userId}`);
        } catch (error) {
            const errorMessage = error instanceof Error ?
                error.message : String(error);
            this.logger.error(`Update user profile error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get hybrid recommendations combining multiple
     factors
     * This is a more advanced version that combines:
     * 1. User profile similarity
     * 2. Popularity
     * 3. Recent releases
     */
    async getHybridRecommendations(
        userId: string,
        limit = 10,
    ): Promise<RecommendationResult[]> {
        try {
            this.logger.log(`Getting hybrid recommendations for user ${userId}`);

            // Get personalized recommendations (profile-based)
            const profileRecs = await
                this.getPersonalizedRecommendations(userId, limit * 2);

            if (profileRecs.length === 0) {
                // Fallback to popular movies if no profile yet
                return this.getPopularRecommendations(limit);
            }

            // Rerank by combining similarity and popularity
            // Formula: score = 0.7 * similarity + 0.3 * normalized_popularity
            const maxPopularity =
                Math.max(...profileRecs.map(m => m.popularity || 0));

            const reranked = profileRecs
                .map(movie => {
                    const normalizedPopularity =
                        maxPopularity > 0
                            ? (movie.popularity || 0) /
                            maxPopularity
                            : 0;
                    const score = 0.7 * movie.similarity +
                        0.3 * normalizedPopularity;
                    return { ...movie, score };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

            this.logger.log(`Reranked to ${reranked.length} hybrid recommendations`);
            return reranked;
        } catch (error) {
            const errorMessage = error instanceof Error ?
                error.message : String(error);
            this.logger.error(`Get hybrid recommendations error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Fallback: Get popular movies for users without
     profile
     */
    async getPopularRecommendations(limit = 10):
        Promise<RecommendationResult[]> {
        try {
            this.logger.log(`Getting popular movies as fallback recommendations`);
            const cacheKey = `popular:${limit}`;
            const cached = await this.redisService.get<RecommendationResult[]>(cacheKey);

            if (cached) {
                this.logger.log(`✅ Cache HIT for popular movies`);
                return cached;
            }

            this.logger.log(`❌ Cache MISS for popular movies - fetching from DB...`);

            const { data, error } = await (supabase as any)
                .from('movies')
                .select('id, title, description, poster_url, backdrop_url, genres, vote_average, popularity, release_date')
                .not('embedding', 'is', null) // Only movies with embeddings
                .order('popularity', { ascending: false })
                .limit(limit);

            if (error) {
                throw error;
            }

            const results = ((data || []) as any[]).map(movie => ({
                ...movie,
                similarity: 0, // No similarity for popular movies
            }));
            this.logger.log(`Found ${results.length} popular movies`);

            if (results.length > 0) {
                await this.redisService.set(cacheKey, results, 86400);
                this.logger.log(`💾 Cached popular movies for 24 hours`);
            }

            return results as RecommendationResult[];
        } catch (error) {
            const errorMessage = error instanceof Error ?
                error.message : String(error);
            this.logger.error(`Get popular recommendations error: ${errorMessage}`);
            throw error;
        }
    }
}