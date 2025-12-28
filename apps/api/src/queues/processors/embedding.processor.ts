import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmbeddingsService } from '../../embeddings/embeddings.service';
import { EmbeddingJob } from '../queues.service';

@Processor('embedding-generation')
export class EmbeddingProcessor extends WorkerHost {
    private readonly logger = new Logger(EmbeddingProcessor.name);

    constructor(private readonly embeddingsService: EmbeddingsService) {
        super();
    }

    async process(job: Job<EmbeddingJob>): Promise<any> {
        const { movieId, batchSize } = job.data;

        try {
            if (movieId) {
                // Генерация для одного фильма
                this.logger.log(`🧠 Generating embedding for movie ${movieId}`);

                await this.embeddingsService.generateMovieEmbedding(movieId);

                this.logger.log(`✅ Embedding generated for movie ${movieId}`);

                return { success: true, movieId };
            } else {
                // Генерация для всех фильмов без embeddings
                this.logger.log(`🧠 Generating embeddings for all movies (batch size: ${batchSize || 50})`);

                const result = await this.embeddingsService.generateAllMissingEmbeddings();

                this.logger.log(`✅ Batch embeddings completed: ${result.processed} processed, ${result.failed} failed`);

                return {
                    success: true,
                    processed: result.processed,
                    failed: result.failed,
                };
            }
        } catch (error) {
            this.logger.error(`❌ Embedding generation failed: ${error.message}`);
            throw error;
        }
    }
}