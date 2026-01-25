import { Controller, Get, Post, Query, Body, Logger } from
        '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { parseCursor, Cursor } from '../utils/cursor.utils';

@Controller('recommendations')
export class RecommendationsController {
    private readonly logger = new Logger(RecommendationsController.name);
    private readonly MAX_LIMIT = 50;
    private readonly DEFAULT_LIMIT = 10;

    constructor(private readonly recommendationsService: RecommendationsService) {}

    /**
     * Parse and validate limit parameter
     */
    private parseLimit(limit: string | undefined, defaultValue: number = this.DEFAULT_LIMIT): number {
        if (!limit) return defaultValue;

        const parsed = parseInt(limit, 10);
        if (isNaN(parsed) || !isFinite(parsed) || parsed < 1) {
            return defaultValue;
        }

        return Math.min(parsed, this.MAX_LIMIT);
    }

    /**
     * GET /api/recommendations?user_id=xxx&limit=10&language=en
     * Get personalized recommendations for a user
     */
    @Get()
    async getRecommendations(
        @Query('user_id') userId: string,
        @Query('limit') limit?: string,
        @Query('language') language?: string,
    ) {
        if (!userId) {
            return { error: 'Query parameter "user_id" is required' };
        }

        try {
            const maxResults = this.parseLimit(limit);
            const results = await this.recommendationsService.getPersonalizedRecommendations(
                userId,
                maxResults,
                language,
            );

                return {
                    success: true,
                    userId,
                    count: results.length,
                    recommendations: results,
                };
            } catch (error) {
                const errorMessage = error instanceof Error ?
                    error.message : String(error);
                this.logger.error(`Get recommendations failed:
   ${errorMessage}`);
                return {
                    success: false,
                    error: errorMessage,
                };
            }
        }

        /**
         * GET
         /api/recommendations/hybrid?user_id=xxx&limit=10&language=en
         * Get hybrid recommendations (profile + popularity)
         */
    @Get('hybrid')
    async getHybridRecommendations(
            @Query('user_id') userId: string,
        @Query('limit') limit?: string,
        @Query('language') language?: string,
    ) {
        if (!userId) {
            return { error: 'Query parameter "user_id" is required' };
        }

        try {
            const maxResults = this.parseLimit(limit);
            const results = await this.recommendationsService.getHybridRecommendations(
                userId,
                maxResults,
                language,
            );

                    return {
                        success: true,
                        userId,
                        count: results.length,
                        recommendations: results,
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ?
                        error.message : String(error);
                    this.logger.error(`Get hybrid recommendations failed: ${errorMessage}`);
                    return {
                        success: false,
                        error: errorMessage,
                    };
                }
            }

            /**
             * GET /api/recommendations/popular?limit=10&language=en
             * Get popular movies (fallback for users without
             profile)
             */
    @Get('popular')
    async getPopularRecommendations(
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
        @Query('language') language?: string,
    ) {
        try {
            const maxResults = this.parseLimit(limit);
            const cursorValues = cursor ? parseCursor(cursor) : undefined;
            if (cursor && !cursorValues) {
                return { success: false, error: 'Invalid cursor' };
            }

            const { results, nextCursor, hasMore } =
                await this.recommendationsService.getPopularRecommendationsPage(
                    maxResults,
                    language,
                    cursorValues,
                );

                    return {
                        success: true,
                        count: results.length,
                        recommendations: results,
                        nextCursor,
                        hasMore,
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ?
                        error.message : String(error);
                    this.logger.error(`Get popular recommendations
   failed: ${errorMessage}`);
                    return {
                        success: false,
                        error: errorMessage,
                    };
                }
            }

            /**
             * POST /api/recommendations/update-profile
             * Manually trigger user profile update
             */
        @Post('update-profile')
        async updateUserProfile(
                @Body() body: { user_id: string; min_rating?: number },
        ) {
                if (!body.user_id) {
                    return { error: 'user_id is required' };
                }

                try {
                    await
                        this.recommendationsService.updateUserProfile(
                            body.user_id,
                            body.min_rating || 7,
                        );

                    return {
                        success: true,
                        message: 'User profile updated successfully',
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ?
                        error.message : String(error);
                    this.logger.error(`Update user profile failed:
   ${errorMessage}`);
                    return {
                        success: false,
                        error: errorMessage,
                    };
                }
            }
        }
