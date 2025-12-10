import { Injectable, Logger } from '@nestjs/common';
import { generateEmbedding, generateEmbeddingsBatch, createMovieEmbeddingText } from '@repo/ai';
import { supabase } from '@repo/db';
import type { Movie } from '@repo/db';

@Injectable()
export class EmbeddingsService {
    private readonly logger = new Logger(EmbeddingsService.name);

    /**
     * Generate embedding for a single movie and update in database
     */
    async generateMovieEmbedding(movieId: number): Promise<void> {
        try {
            // 1. Get movie from database
            const { data: movie, error: fetchError } = await supabase
                .from('movies')
                .select('*')
                .eq('id', movieId)
                .single();

            if (fetchError || !movie) {
                throw new Error(`Movie ${movieId} not found`);
            }

            // Type assertion since Supabase returns any
            const typedMovie = movie as Movie;

            // 2. Create embedding text
            const embeddingText = createMovieEmbeddingText({
                title: typedMovie.title,
                description: typedMovie.description,
                genres: typedMovie.genres,
            });

            this.logger.log(`Generating embedding for: ${typedMovie.title}`);

            // 3. Generate embedding
            const embedding = await generateEmbedding(embeddingText);

            // 4. Update movie with embedding
            const { error: updateError } = await (supabase
                .from('movies')
                .update as any)({ embedding: JSON.stringify(embedding) })
                .eq('id', movieId);


            if (updateError) {
                throw updateError;
            }

            this.logger.log(`✅ Embedding generated for: ${typedMovie.title}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error generating embedding for movie ${movieId}: 
  ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Generate embeddings for all movies without embeddings
     */
    async generateAllMissingEmbeddings(): Promise<{ processed: number; failed: number }> {
        try {
            // 1. Get all movies without embeddings
            const { data: movies, error: fetchError } = await supabase
                .from('movies')
                .select('*')
                .is('embedding', null);

            if (fetchError) {
                throw fetchError;
            }

            if (!movies || movies.length === 0) {
                this.logger.log('No movies without embeddings found');
                return { processed: 0, failed: 0 };
            }

            // Type assertion for movies array
            const typedMovies = movies as Movie[];

            this.logger.log(`Found ${typedMovies.length} movies without embeddings`);

            // 2. Prepare embedding texts
            const movieTexts = typedMovies.map(movie =>
                createMovieEmbeddingText({
                    title: movie.title,
                    description: movie.description,
                    genres: movie.genres,
                })
            );

            // 3. Generate embeddings in batch
            this.logger.log('Generating embeddings batch...');
            const embeddings = await generateEmbeddingsBatch(movieTexts, 50);

            // 4. Update movies in database
            let processed = 0;
            let failed = 0;

            for (let i = 0; i < typedMovies.length; i++) {
                try {
                    const { error: updateError } = await (supabase
                        .from('movies')
                        .update as any)({ embedding: JSON.stringify(embeddings[i]) })
                        .eq('id', typedMovies[i].id);

                    if (updateError) {
                        throw updateError;
                    }

                    processed++;
                    this.logger.log(`[${i + 1}/${typedMovies.length}] ✅ 
  ${typedMovies[i].title}`);
                } catch (error) {
                    failed++;
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error(`Failed to update ${typedMovies[i].title}: 
  ${errorMessage}`);
                }
            }

            this.logger.log(`✅ Batch complete: ${processed} processed, ${failed} failed`);
            return { processed, failed };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error in batch generation: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Regenerate embedding for a specific movie (force update)
     */
    async regenerateMovieEmbedding(movieId: number): Promise<void> {
        this.logger.log(`Regenerating embedding for movie ${movieId}...`);
        await this.generateMovieEmbedding(movieId);
    }
}
