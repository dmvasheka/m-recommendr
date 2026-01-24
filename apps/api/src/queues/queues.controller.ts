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
            const [movieImportStats, tvImportStats, embeddingStats, translationStats] = await Promise.all([
                this.queuesService.getMovieImportStats(),
                this.queuesService.getTvImportStats(),
                this.queuesService.getEmbeddingStats(),
                this.queuesService.getTranslationUpdateStats(),
            ]);

            return {
                success: true,
                stats: {
                    movieImport: movieImportStats,
                    tvImport: tvImportStats,
                    embeddings: embeddingStats,
                    translations: translationStats,
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
     * POST /api/queues/rotational-movie-import
     * Запустить ротационный импорт фильмов (автоматически выбирает следующую категорию)
     */
    @Post('rotational-movie-import')
    async rotationalMovieImport(@Body() body: { count?: number }) {
        try {
            const count = body.count || 50;
            const job = await this.queuesService.addRotationalMovieImportJob(count);

            return {
                success: true,
                message: 'Rotational movie import job added to queue',
                jobId: job.id,
                count,
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
     * POST /api/queues/rotational-tv-import
     * Запустить ротационный импорт сериалов (автоматически выбирает следующую категорию)
     */
    @Post('rotational-tv-import')
    async rotationalTvImport(@Body() body: { count?: number }) {
        try {
            const count = body.count || 50;
            const job = await this.queuesService.addRotationalTvImportJob(count);

            return {
                success: true,
                message: 'Rotational TV import job added to queue',
                jobId: job.id,
                count,
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
     * POST /api/queues/schedule-rotational-movie-import
     * Запланировать автоматический ротационный импорт фильмов
     */
    @Post('schedule-rotational-movie-import')
    async scheduleRotationalMovieImport(
        @Body() body: { cronExpression: string; count: number }
    ) {
        try {
            await this.queuesService.scheduleRotationalMovieImport(
                body.cronExpression,
                body.count
            );

            return {
                success: true,
                message: `Scheduled rotational movie import: ${body.cronExpression} (${body.count} per run)`,
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
     * POST /api/queues/schedule-rotational-tv-import
     * Запланировать автоматический ротационный импорт TV shows
     */
    @Post('schedule-rotational-tv-import')
    async scheduleRotationalTvImport(
        @Body() body: { cronExpression: string; count: number }
    ) {
        try {
            await this.queuesService.scheduleRotationalTvImport(
                body.cronExpression,
                body.count
            );

            return {
                success: true,
                message: `Scheduled rotational TV import: ${body.cronExpression} (${body.count} per run)`,
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
     * GET /api/queues/rotation-status
     * Получить статус ротации категорий
     */
    @Get('rotation-status')
    async getRotationStatus() {
        try {
            const status = await this.queuesService.getRotationStatus();

            return {
                success: true,
                rotation: status,
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
     * POST /api/queues/update-translations
     * Обновить переводы и локализованные постеры
     */
    @Post('update-translations')
    async updateTranslations(
        @Body() body: {
            type: 'movies' | 'tv';
            limit?: number;
            offset?: number;
            force?: boolean;
            ids?: number[];
        }
    ) {
        try {
            const job = await this.queuesService.addTranslationUpdateJob({
                type: body.type,
                limit: body.limit || 100,
                offset: body.offset || 0,
                force: body.force || false,
                ids: body.ids,
            });

            return {
                success: true,
                message: `Translation update job added to queue`,
                jobId: job.id,
                type: body.type,
                limit: body.limit || 100,
                force: body.force || false,
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
     * POST /api/queues/batch-update-translations
     * Массовое обновление переводов (разбивает на batch jobs)
     */
    @Post('batch-update-translations')
    async batchUpdateTranslations(
        @Body() body: {
            type: 'movies' | 'tv';
            totalCount: number;
            batchSize?: number;
            force?: boolean;
        }
    ) {
        try {
            const batchSize = body.batchSize || 100;
            const jobs = await this.queuesService.addBatchTranslationUpdateJobs(
                body.type,
                body.totalCount,
                batchSize,
                body.force || false
            );

            return {
                success: true,
                message: `Added ${jobs.length} translation update jobs`,
                totalJobs: jobs.length,
                totalItems: body.totalCount,
                batchSize,
                force: body.force || false,
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
     * GET /api/queues/translation-stats
     * Получить статистику очереди обновления переводов
     */
    @Get('translation-stats')
    async getTranslationStats() {
        try {
            const stats = await this.queuesService.getTranslationUpdateStats();

            return {
                success: true,
                stats,
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
