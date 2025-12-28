import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface MovieImportJob {
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
        await this.embeddingQueue.clean(24 * 3600 * 1000, 100, 'completed');
        this.logger.log('🧹 Old jobs cleaned');
    }
}
