import { Controller, Get, Post, Query, Body, Logger } from
        '@nestjs/common';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
    private readonly logger = new
    Logger(RecommendationsController.name);

    constructor(private readonly recommendationsService:
                RecommendationsService) {}

    /**
     * GET /api/recommendations?user_id=xxx&limit=10
     * Get personalized recommendations for a user
     */
    @Get()
    async getRecommendations(
        @Query('user_id') userId: string,
        @Query('limit') limit?: string,
    ) {
        if (!userId) {
            return { error: 'Query parameter "user_id" is required' };
            }

            try {
                const maxResults = limit ? parseInt(limit, 10)
                    : 10;
                const results = await this.recommendationsService.getPersonalizedRecommendations(
                    userId,
                    maxResults,
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
         /api/recommendations/hybrid?user_id=xxx&limit=10
         * Get hybrid recommendations (profile + popularity)
         */
    @Get('hybrid')
    async getHybridRecommendations(
            @Query('user_id') userId: string,
        @Query('limit') limit?: string,
    ) {
            if (!userId) {
                return { error: 'Query parameter "user_id" is required' };
                }

                try {
                    const maxResults = limit ? parseInt(limit, 10)
                        : 10;
                    const results = await
                        this.recommendationsService.getHybridRecommendations(
                            userId,
                            maxResults,
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
             * GET /api/recommendations/popular?limit=10
             * Get popular movies (fallback for users without
             profile)
             */
        @Get('popular')
        async getPopularRecommendations(@Query('limit') limit?: string) {
                try {
                    const maxResults = limit ? parseInt(limit, 10)
                        : 10;
                    const results = await
                        this.recommendationsService.getPopularRecommendations(
                            maxResults,
                        );

                    return {
                        success: true,
                        count: results.length,
                        recommendations: results,
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