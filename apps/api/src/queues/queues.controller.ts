import { Controller, Post, Get, Body, Query, Logger } from '@nestjs/common';
import { QueuesService } from './queues.service';

@Controller('queues')
export class QueuesController {
    private readonly logger = new Logger(QueuesController.name);

    constructor(private readonly queuesService: QueuesService) {}

    /**
     * POST /api/queues/movie-import
     * Добавить задачу на импорт фильмов
     */
    @Post('movie-import')
    async addMovieImportJob(
        @Body() body: { count: number; page?: number; year?: number }
    ) {
        try {
            const job = await this.queuesService.addMovieImportJob({
                count: body.count,
                page: body.page,
                year: body.year,
            });

            return {
                success: true,
                message: 'Movie import job added to queue',
                jobId: job.id,
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
     * POST /api/queues/tv-import
     * Добавить задачу на импорт TV shows
     */
    @Post('tv-import')
    async addTvImportJob(
        @Body() body: { year: number; count: number; page?: number }
    ) {
        try {
            const job = await this.queuesService.addTvImportJob({
                year: body.year,
                count: body.count,
                page: body.page,
            });

            return {
                success: true,
                message: 'TV show import job added to queue',
                jobId: job.id,
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
     * POST /api/queues/generate-embeddings
     * Добавить задачу на генерацию embeddings
     */
    @Post('generate-embeddings')
    async addEmbeddingJob(
        @Body() body: { movieId?: number; batchSize?: number }
    ) {
        try {
            const job = await this.queuesService.addEmbeddingJob({
                movieId: body.movieId,
                batchSize: body.batchSize,
            });

            return {
                success: true,
                message: 'Embedding generation job added to queue',
                jobId: job.id,
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
     * POST /api/queues/schedule-import
     * Запланировать автоматический импорт фильмов
     */
    @Post('schedule-import')
    async scheduleMovieImport(
        @Body() body: { cronExpression: string; count: number }
    ) {
        try {
            await this.queuesService.scheduleMovieImport(
                body.cronExpression,
                body.count
            );

            return {
                success: true,
                message: `Scheduled movie import: ${body.cronExpression}`,
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
     * POST /api/queues/schedule-tv-import
     * Запланировать автоматический импорт TV shows
     */
    @Post('schedule-tv-import')
    async scheduleTvImport(
        @Body() body: { cronExpression: string; year: number; count: number }
    ) {
        try {
            await this.queuesService.scheduleTvImport(
                body.cronExpression,
                body.year,
                body.count
            );

            return {
                success: true,
                message: `Scheduled TV show import: ${body.cronExpression}`,
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
     * GET /api/queues/stats
     * Получить статистику по очередям
     */
    @Get('stats')
    async getStats() {
        try {
            const [movieImportStats, tvImportStats, embeddingStats] = await Promise.all([
                this.queuesService.getMovieImportStats(),
                this.queuesService.getTvImportStats(),
                this.queuesService.getEmbeddingStats(),
            ]);

            return {
                success: true,
                stats: {
                    movieImport: movieImportStats,
                    tvImport: tvImportStats,
                    embeddings: embeddingStats,
                },
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
     * POST /api/queues/batch-movie-import
     * Массовый импорт фильмов по диапазону лет
     */
    @Post('batch-movie-import')
    async batchMovieImport(
        @Body() body: { startYear: number; endYear: number; countPerYear: number }
    ) {
        try {
            const jobs = await this.queuesService.addBatchMovieImportJobs(
                body.startYear,
                body.endYear,
                body.countPerYear
            );

            return {
                success: true,
                message: `Added ${jobs.length} movie import jobs`,
                totalJobs: jobs.length,
                totalMovies: jobs.length * body.countPerYear,
                yearRange: `${body.startYear}-${body.endYear}`,
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
     * POST /api/queues/batch-tv-import
     * Массовый импорт сериалов по диапазону лет
     */
    @Post('batch-tv-import')
    async batchTvImport(
        @Body() body: { startYear: number; endYear: number; countPerYear: number }
    ) {
        try {
            const jobs = await this.queuesService.addBatchTvImportJobs(
                body.startYear,
                body.endYear,
                body.countPerYear
            );

            return {
                success: true,
                message: `Added ${jobs.length} TV show import jobs`,
                totalJobs: jobs.length,
                totalShows: jobs.length * body.countPerYear,
                yearRange: `${body.startYear}-${body.endYear}`,
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
     * POST /api/queues/clean
     * Очистить завершённые задачи
     */
    @Post('clean')
    async cleanQueues() {
        try {
            await this.queuesService.cleanQueues();

            return {
                success: true,
                message: 'Old jobs cleaned successfully',
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
}
