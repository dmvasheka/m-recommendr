import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CategoryRotationService } from '../tmdb/category-rotation.service';
import { TmdbService } from '../tmdb/tmdb.service';

export interface MovieImportJob {
    count: number;
    page?: number;
    year?: number;
    category?: string;
}

export interface TvImportJob {
    year?: number;
    count: number;
    page?: number;
    category?: string;
}

export interface EmbeddingJob {
    movieId?: number;
    batchSize?: number;
}

@Injectable()
export class QueuesService {
    private readonly logger = new Logger(QueuesService.name);

    constructor(
        @InjectQueue('movie-import') private movieImportQueue: Queue,
        @InjectQueue('tv-import') private tvImportQueue: Queue,
        @InjectQueue('embedding-generation') private embeddingQueue: Queue,
        private readonly categoryRotationService: CategoryRotationService,
        private readonly tmdbService: TmdbService,
    ) {}

    // Movie Import Queue
    async addMovieImportJob(data: MovieImportJob) {
        const job = await this.movieImportQueue.add('import-movies', data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        });
        this.logger.log(`📥 Movie import job added: ${job.id}`);
        return job;
    }

    async scheduleMovieImport(cronExpression: string, count: number) {
        await this.movieImportQueue.add(
            'import-movies',
            { count },
            {
                repeat: {
                    pattern: cronExpression,
                },
            },
        );
        this.logger.log(`⏰ Scheduled movie import: ${cronExpression}`);
    }

    // TV Show Import Queue
    async addTvImportJob(data: TvImportJob) {
        const job = await this.tvImportQueue.add('import-tv-shows', data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        });
        this.logger.log(`📥 TV show import job added: ${job.id}`);
        return job;
    }

    async scheduleTvImport(cronExpression: string, year: number, count: number) {
        await this.tvImportQueue.add(
            'import-tv-shows',
            { year, count },
            {
                repeat: {
                    pattern: cronExpression,
                },
            },
        );
        this.logger.log(`⏰ Scheduled TV show import: ${cronExpression}`);
    }

    // Batch Import - Movies by Year Range
    async addBatchMovieImportJobs(startYear: number, endYear: number, countPerYear: number) {
        const jobs = [];
        for (let year = startYear; year <= endYear; year++) {
            const job = await this.addMovieImportJob({
                year,
                count: countPerYear,
            });
            jobs.push(job);
        }
        this.logger.log(`📦 Added ${jobs.length} movie import jobs (${startYear}-${endYear}, ${countPerYear} per year)`);
        return jobs;
    }

    // Batch Import - TV Shows by Year Range
    async addBatchTvImportJobs(startYear: number, endYear: number, countPerYear: number) {
        const jobs = [];
        for (let year = startYear; year <= endYear; year++) {
            const job = await this.addTvImportJob({
                year,
                count: countPerYear,
            });
            jobs.push(job);
        }
        this.logger.log(`📦 Added ${jobs.length} TV show import jobs (${startYear}-${endYear}, ${countPerYear} per year)`);
        return jobs;
    }

    // Embedding Generation Queue
    async addEmbeddingJob(data: EmbeddingJob) {
        const job = await this.embeddingQueue.add('generate-embeddings', data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        });
        this.logger.log(`🧠 Embedding job added: ${job.id}`);
        return job;
    }

    // Queue Stats
    async getMovieImportStats() {
        return {
            waiting: await this.movieImportQueue.getWaitingCount(),
            active: await this.movieImportQueue.getActiveCount(),
            completed: await this.movieImportQueue.getCompletedCount(),
            failed: await this.movieImportQueue.getFailedCount(),
        };
    }

    async getTvImportStats() {
        return {
            waiting: await this.tvImportQueue.getWaitingCount(),
            active: await this.tvImportQueue.getActiveCount(),
            completed: await this.tvImportQueue.getCompletedCount(),
            failed: await this.tvImportQueue.getFailedCount(),
        };
    }

    async getEmbeddingStats() {
        return {
            waiting: await this.embeddingQueue.getWaitingCount(),
            active: await this.embeddingQueue.getActiveCount(),
            completed: await this.embeddingQueue.getCompletedCount(),
            failed: await this.embeddingQueue.getFailedCount(),
        };
    }

    // Rotational Import - Movies
    async addRotationalMovieImportJob(count: number = 50) {
        try {
            // Get next category from rotation
            const category = await this.categoryRotationService.getNextCategory('movies');

            const job = await this.movieImportQueue.add(
                'import-movies-rotational',
                { count, category },
                {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                }
            );

            this.logger.log(`📥 Rotational movie import job added: category=${category}, count=${count}, jobId=${job.id}`);
            return job;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to add rotational movie import: ${errorMessage}`);
            throw error;
        }
    }

    // Rotational Import - TV Shows
    async addRotationalTvImportJob(count: number = 50) {
        try {
            // Get next category from rotation
            const category = await this.categoryRotationService.getNextCategory('tv_shows');

            const job = await this.tvImportQueue.add(
                'import-tv-rotational',
                { count, category },
                {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                }
            );

            this.logger.log(`📥 Rotational TV import job added: category=${category}, count=${count}, jobId=${job.id}`);
            return job;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to add rotational TV import: ${errorMessage}`);
            throw error;
        }
    }

    // Schedule rotational movie import
    async scheduleRotationalMovieImport(cronExpression: string, count: number) {
        // Get next category from rotation
        const category = await this.categoryRotationService.getNextCategory('movies');

        await this.movieImportQueue.add(
            'import-movies-rotational',
            { count, category },
            {
                repeat: { pattern: cronExpression },
            }
        );
        this.logger.log(`⏰ Scheduled rotational movie import: ${cronExpression} (${count} per run, category=${category})`);
    }

    // Schedule rotational TV import
    async scheduleRotationalTvImport(cronExpression: string, count: number) {
        // Get next category from rotation
        const category = await this.categoryRotationService.getNextCategory('tv_shows');

        await this.tvImportQueue.add(
            'import-tv-rotational',
            { count, category },
            {
                repeat: { pattern: cronExpression },
            }
        );
        this.logger.log(`⏰ Scheduled rotational TV import: ${cronExpression} (${count} per run, category=${category})`);
    }

    // Get rotation status
    async getRotationStatus() {
        return await this.categoryRotationService.getRotationStatus();
    }

    // Clean old jobs
    async cleanQueues() {
        await this.movieImportQueue.clean(24 * 3600 * 1000, 100, 'completed');
        await this.tvImportQueue.clean(24 * 3600 * 1000, 100, 'completed');
        await this.embeddingQueue.clean(24 * 3600 * 1000, 100, 'completed');
        this.logger.log('🧹 Old jobs cleaned');
    }
}
