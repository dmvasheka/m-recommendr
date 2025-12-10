import { Controller, Post, Param, Get, Logger } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';

@Controller('embeddings')
export class EmbeddingsController {
    private readonly logger = new Logger(EmbeddingsController.name);

    constructor(private readonly embeddingsService: EmbeddingsService) {}

    /**
     * POST /api/embeddings/movie/:id
     * Generate embedding for a specific movie
     */
    @Post('movie/:id')
    async generateMovieEmbedding(@Param('id') id: string) {
        const movieId = parseInt(id, 10);
        if (isNaN(movieId)) {
            return { error: 'Invalid movie ID' };
        }

        try {
            await this.embeddingsService.generateMovieEmbedding(movieId);
            return {
                success: true,
                message: `Embedding generated for movie ${movieId}`,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to generate embedding: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * POST /api/embeddings/generate-all
     * Generate embeddings for all movies without embeddings
     */
    @Post('generate-all')
    async generateAllEmbeddings() {
        try {
            this.logger.log('Starting batch embedding generation...');
            const result = await this.embeddingsService.generateAllMissingEmbeddings();

            return {
                success: true,
                message: `Batch complete: ${result.processed} processed, ${result.failed} 
  failed`,
                ...result,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Batch generation failed: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * POST /api/embeddings/regenerate/:id
     * Regenerate embedding for a specific movie (force update)
     */
    @Post('regenerate/:id')
    async regenerateMovieEmbedding(@Param('id') id: string) {
        const movieId = parseInt(id, 10);
        if (isNaN(movieId)) {
            return { error: 'Invalid movie ID' };
        }

        try {
            await this.embeddingsService.regenerateMovieEmbedding(movieId);
            return {
                success: true,
                message: `Embedding regenerated for movie ${movieId}`,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to regenerate embedding: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
}
