import { Controller, Get, Query, Param, Logger } from '@nestjs/common';
import { TvShowsService } from './tv-shows.service';

@Controller('tv-shows')
export class TvShowsController {
    private readonly logger = new Logger(TvShowsController.name);

    constructor(private readonly tvShowsService: TvShowsService) {}

    /**
     * GET /api/tv-shows/autocomplete?q=query&limit=10
     * Fast search for UI autocomplete
     */
    @Get('autocomplete')
    async autocomplete(
        @Query('q') query: string,
        @Query('limit') limit?: string,
    ) {
        if (!query || query.length < 2) {
            return { success: true, results: [] };
        }

        try {
            const maxResults = limit ? parseInt(limit, 10) : 10;
            const results = await this.tvShowsService.autocomplete(query, maxResults);

            return {
                success: true,
                count: results.length,
                results,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * GET /api/tv-shows/search?q=query&limit=10
     * Semantic search for TV shows
     */
    @Get('search')
    async searchTvShows(
        @Query('q') query: string,
        @Query('limit') limit?: string,
    ) {
        if (!query) {
            return { error: 'Query parameter "q" is required' };
        }

        try {
            const maxResults = limit ? parseInt(limit, 10) : 10;
            const results = await this.tvShowsService.searchTvShows(query, maxResults);

            return {
                success: true,
                query,
                count: results.length,
                results,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Search failed: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * GET /api/tv-shows/:id
     * Get TV show by ID
     */
    @Get(':id')
    async getTvShowById(@Param('id') id: string) {
        const tvShowId = parseInt(id, 10);
        if (isNaN(tvShowId)) {
            return { error: 'Invalid TV show ID' };
        }

        try {
            const tvShow = await this.tvShowsService.getTvShowById(tvShowId);

            if (!tvShow) {
                return {
                    success: false,
                    error: 'TV Show not found',
                };
            }

            return {
                success: true,
                tvShow,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get TV show failed: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * GET /api/tv-shows?page=1&pageSize=20
     * Get all TV shows with pagination (sorted by popularity)
     */
    @Get()
    async getAllTvShows(
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
    ) {
        try {
            const pageNum = page ? parseInt(page, 10) : 1;
            const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;

            const { tvShows, total } = await this.tvShowsService.getAllTvShows(pageNum, pageSizeNum);

            return {
                success: true,
                page: pageNum,
                pageSize: pageSizeNum,
                total,
                totalPages: Math.ceil(total / pageSizeNum),
                tvShows,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get all TV shows failed: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
}
