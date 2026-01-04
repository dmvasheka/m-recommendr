import {Controller, Get, Query, Param, Logger, Post, Body} from '@nestjs/common';
import {MoviesService, SearchResult} from './movies.service';

@Controller('movies')
export class MoviesController {
    private readonly logger = new Logger(MoviesController.name);

    constructor(private readonly moviesService: MoviesService) {}

    /**
     * GET /api/movies/search?q=query&limit=10
     * Semantic search for movies
     */
    @Get('search')
    async searchMovies(
        @Query('q') query: string,
        @Query('limit') limit?: string,
    ) {
        if (!query) {
            return { error: 'Query parameter "q" is required' };
        }

        try {
            const maxResults = limit ? parseInt(limit, 10) : 10;
            const results = await this.moviesService.searchMovies(query,
                maxResults);

            return {
                success: true,
                query,
                count: results.length,
                results,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message :
                String(error);
            this.logger.error(`Search failed: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * GET /api/movies/:id/similar?limit=10
     * Get similar movies
     */
    @Get(':id/similar')
    async getSimilarMovies(
        @Param('id') id: string,
        @Query('limit') limit?: string,
    ) {
        const movieId = parseInt(id, 10);
        if (isNaN(movieId)) {
            return { error: 'Invalid movie ID' };
        }

        try {
            const maxResults = limit ? parseInt(limit, 10) : 10;
            const results = await this.moviesService.getSimilarMovies(movieId,
                maxResults);

            return {
                success: true,
                movieId,
                count: results.length,
                results,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message :
                String(error);
            this.logger.error(`Similar movies failed: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * GET /api/movies/:id
     * Get movie by ID
     */
    @Get(':id')
    async getMovieById(@Param('id') id: string) {
        const movieId = parseInt(id, 10);
        if (isNaN(movieId)) {
            return { error: 'Invalid movie ID' };
        }

        try {
            const movie = await this.moviesService.getMovieById(movieId);

            if (!movie) {
                return {
                    success: false,
                    error: 'Movie not found',
                };
            }

            return {
                success: true,
                movie,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message :
                String(error);
            this.logger.error(`Get movie failed: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * GET /api/movies?page=1&pageSize=20
     * Get all movies with pagination
     */
    @Get()
    async getAllMovies(
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
    ) {
        try {
            const pageNum = page ? parseInt(page, 10) : 1;
            const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;

            const { movies, total } = await this.moviesService.getAllMovies(pageNum,
                pageSizeNum);

            return {
                success: true,
                page: pageNum,
                pageSize: pageSizeNum,
                total,
                totalPages: Math.ceil(total / pageSizeNum),
                movies,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message :
                String(error);
            this.logger.error(`Get all movies failed: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    @Post('similar-to-multiple')
    async getSimilarToMultiple(
        @Body() body: { movieIds: number[]; limit?: number }
    ): Promise<SearchResult[]> {
        const { movieIds, limit = 10 } = body;
        return this.moviesService.getSimilarToMultiple(movieIds, limit);
    }
}
