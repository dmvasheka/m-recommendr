import { Controller, Get, Post, Delete, Body, Query, Param, Logger } from '@nestjs/common';
import { WatchlistService } from './watchlist.service';

@Controller('watchlist')
export class WatchlistController {
    private readonly logger = new Logger(WatchlistController.name);

    constructor(private readonly watchlistService: WatchlistService)
    {}

    /**
     * POST /api/watchlist/add
     * Add movie to watchlist
     */
    @Post('add')
    async addToWatchlist(
        @Body() body: { user_id: string; movie_id: number; status?:
                'planned' | 'watched' },
    ) {
        try {
            const item = await
                this.watchlistService.addToWatchlist(body);
            return {
                success: true,
                message: 'Movie added to watchlist',
                item,
            };
        } catch (error) {
            let errorMessage = 'Unknown error';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (error && typeof error === 'object') {
                errorMessage = JSON.stringify(error);
            } else {
                errorMessage = String(error);
            }
            this.logger.error(`Add to watchlist failed: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * POST /api/watchlist/watched
     * Mark movie as watched with optional rating
     */
    @Post('watched')
    async markAsWatched(
        @Body() body: { user_id: string; movie_id: number; rating?:
                number },
    ) {
        try {
            const item = await
                this.watchlistService.markAsWatched(body);
            return {
                success: true,
                message: 'Movie marked as watched',
                item,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ?
                error.message : String(error);
            this.logger.error(`Mark as watched failed: 
  ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * GET /api/watchlist?user_id=xxx&status=planned|watched
     * Get user's watchlist with optional filter
     */
    @Get()
    async getWatchlist(
        @Query('user_id') userId: string,
        @Query('status') status?: 'planned' | 'watched',
    ) {
        if (!userId) {
            return { error: 'Query parameter "user_id" is required'
            };
        }

        try {
            const items = await
                this.watchlistService.getUserWatchlist(userId, status);
            return {
                success: true,
                userId,
                status: status || 'all',
                count: items.length,
                items,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ?
                error.message : String(error);
            this.logger.error(`Get watchlist failed: 
  ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * DELETE /api/watchlist/:movieId?user_id=xxx
     * Remove movie from watchlist
     */
    @Delete(':movieId')
    async removeFromWatchlist(
        @Param('movieId') movieId: string,
        @Query('user_id') userId: string,
    ) {
        if (!userId) {
            return { error: 'Query parameter "user_id" is required'
            };
        }

        const id = parseInt(movieId, 10);
        if (isNaN(id)) {
            return { error: 'Invalid movie ID' };
        }

        try {
            await this.watchlistService.removeFromWatchlist(userId,
                id);
            return {
                success: true,
                message: 'Movie removed from watchlist',
            };
        } catch (error) {
            const errorMessage = error instanceof Error ?
                error.message : String(error);
            this.logger.error(`Remove from watchlist failed: 
  ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
}