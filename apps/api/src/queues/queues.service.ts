import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface MovieImportJob {
    count: number;
    page?: number;
    year?: number;
}

export interface TvImportJob {
    year: number;
    count: number;
    page?: number;
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

    // Clean old jobs
    async cleanQueues() {
        await this.movieImportQueue.clean(24 * 3600 * 1000, 100, 'completed');
        await this.tvImportQueue.clean(24 * 3600 * 1000, 100, 'completed');
        await this.embeddingQueue.clean(24 * 3600 * 1000, 100, 'completed');
        this.logger.log('🧹 Old jobs cleaned');
    }
}
