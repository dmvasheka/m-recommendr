import { Controller, Get, Post, Param, Query, Logger } from '@nestjs/common';
import { TmdbService, TmdbSearchResponse, TmdbMovieDetails } from './tmdb.service';

@Controller('tmdb')
export class TmdbController {
    private readonly logger = new Logger(TmdbController.name);

    constructor(private readonly tmdbService: TmdbService) {}

    /**
     * GET /tmdb/search?q=inception&page=1
     * Search movies by query
     */
    @Get('search')
    async searchMovies(
        @Query('q') query: string,
        @Query('page') page?: string,
    ) {
        if (!query) {
            return { error: 'Query parameter "q" is required' };
        }

        const pageNum = page ? parseInt(page, 10) : 1;
        return this.tmdbService.searchMovies(query, pageNum);
    }

    /**
     * GET /tmdb/movie/:id
     * Get movie details by TMDB ID
     */
    @Get('movie/:id')
    async getMovieDetails(@Param('id') id: string) {
        const movieId = parseInt(id, 10);
        if (isNaN(movieId)) {
            return { error: 'Invalid movie ID' };
        }

        return this.tmdbService.getMovieDetails(movieId);
    }

    /**
     * GET /tmdb/popular?page=1
     * Get popular movies
     */
    @Get('popular')
    async getPopularMovies(@Query('page') page?: string) {
        const pageNum = page ? parseInt(page, 10) : 1;
        return this.tmdbService.getPopularMovies(pageNum);
    }

    /**
     * @deprecated Use /tmdb/import instead
     */
    @Post('import/popular')
    async importPopularMovies(@Query('count') count?: string) {
        return this.importMovies('popular', count);
    }

    /**
     * POST /tmdb/import?category=...&count=...
     * Import movies to our database by category
     */
    @Post('import')
    async importMovies(
        @Query('category') category: string,
        @Query('count') count?: string,
    ) {
        const allowedCategories = ['popular', 'top_rated', 'upcoming', 'now_playing'];
        if (!category || !allowedCategories.includes(category)) {
            return { error: `Invalid or missing category. Allowed: ${allowedCategories.join(', ')}` };
        }

        const movieCount = count ? parseInt(count, 10) : 20;

        if (movieCount > 100) {
            return { error: 'Count cannot exceed 100 movies at once' };
        }

        try {
            this.logger.log(`Starting import of ${movieCount} ${category} movies...`);
            const result = await this.tmdbService.importMovies(category, movieCount);

            return {
                success: true,
                message: `Successfully imported ${result.imported} movies`,
                imported: result.imported,
                skipped: result.skipped,
                total: result.imported + result.skipped,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to import ${category} movies: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * POST /tmdb/import/:id
     * Import a specific movie to our database
     */
    @Post('import/:id')
    async importMovie(@Param('id') id: string) {
        const movieId = parseInt(id, 10);
        if (isNaN(movieId)) {
            return { error: 'Invalid movie ID' };
        }

        try {
            const movie = await this.tmdbService.importMovieToDb(movieId);
            return {
                success: true,
                message: `Movie "${movie.title}" imported successfully`,
                movie,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to import movie ${movieId}: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * GET /tmdb/health
     * Check TMDB API connection
     */
    @Get('health')
    async healthCheck() {
        try {
            await this.tmdbService.getPopularMovies(1);
            return {
                status: 'ok',
                message: 'TMDB API is accessible',
                apiKey: process.env.TMDB_API_KEY ? 'configured' : 'missing',
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                status: 'error',
                message: 'Failed to connect to TMDB API',
                error: errorMessage,
            };
        }
    }
}
