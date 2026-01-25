import { Controller, Get, Query, Param, Logger } from '@nestjs/common';
import { TvShowsService } from './tv-shows.service';
import { parseCursor } from '../utils/cursor.utils';

@Controller('tv-shows')
export class TvShowsController {
    private readonly logger = new Logger(TvShowsController.name);

    constructor(private readonly tvShowsService: TvShowsService) {}

    /**
     * GET /api/tv-shows/autocomplete?q=query&limit=10&language=en
     * Fast search for UI autocomplete
     */
    @Get('autocomplete')
    async autocomplete(
        @Query('q') query: string,
        @Query('limit') limit?: string,
        @Query('language') language?: string,
    ) {
        if (!query || query.length < 2) {
            return { success: true, results: [] };
        }

        try {
            const maxResults = limit ? parseInt(limit, 10) : 10;
            const results = await this.tvShowsService.autocomplete(query, maxResults, language);

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
     * GET /api/tv-shows/search?q=query&limit=10&language=en
     * Semantic search for TV shows
     */
    @Get('search')
    async searchTvShows(
        @Query('q') query: string,
        @Query('limit') limit?: string,
        @Query('language') language?: string,
    ) {
        if (!query) {
            return { error: 'Query parameter "q" is required' };
        }

        try {
            const maxResults = limit ? parseInt(limit, 10) : 10;
            const results = await this.tvShowsService.searchTvShows(query, maxResults, language);

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
     * GET /api/tv-shows/:id/seasons
     * Get seasons for a TV show
     */
    @Get(':id/seasons')
    async getTvShowSeasons(@Param('id') id: string) {
        const tvShowId = parseInt(id, 10);
        if (isNaN(tvShowId)) {
            return { success: false, error: 'Invalid TV show ID' };
        }

        try {
            const seasons = await this.tvShowsService.getTvShowSeasons(tvShowId);

            return {
                success: true,
                count: seasons.length,
                seasons,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get TV show seasons failed: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * GET /api/tv-shows/:id?language=en
     * Get TV show by ID
     */
    @Get(':id')
    async getTvShowById(
        @Param('id') id: string,
        @Query('language') language?: string,
    ) {
        const tvShowId = parseInt(id, 10);
        if (isNaN(tvShowId)) {
            return { error: 'Invalid TV show ID' };
        }

        try {
            const tvShow = await this.tvShowsService.getTvShowById(tvShowId, language);

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
     * GET /api/tv-shows?page=1&pageSize=20&language=en
     * GET /api/tv-shows?limit=20&cursor=popularity:id&language=en
     * Get all TV shows with pagination (sorted by popularity)
     */
    @Get()
    async getAllTvShows(
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
        @Query('language') language?: string,
    ) {
        try {
            if (cursor || limit) {
                const limitNum = limit ? parseInt(limit, 10) : 20;
                const cursorValues = cursor ? parseCursor(cursor) : undefined;
                if (cursor && !cursorValues) {
                    return { success: false, error: 'Invalid cursor' };
                }

                const { tvShows, nextCursor, hasMore } =
                    await this.tvShowsService.getTvShowsByCursor(
                        limitNum,
                        language,
                        cursorValues,
                    );

                return {
                    success: true,
                    count: tvShows.length,
                    tvShows,
                    nextCursor,
                    hasMore,
                };
            }

            const pageNum = page ? parseInt(page, 10) : 1;
            const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;

            const { tvShows, total } = await this.tvShowsService.getAllTvShows(pageNum, pageSizeNum, language);

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
