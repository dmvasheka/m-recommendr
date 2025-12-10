import { openai, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from './openai.client';

/**
 * Generate embedding vector for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
    }

    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
        dimensions: EMBEDDING_DIMENSIONS,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
        throw new Error('Failed to generate embedding');
    }

    return embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 * OpenAI allows up to 2048 inputs per request
 */
export async function generateEmbeddingsBatch(
    texts: string[],
    batchSize = 100
): Promise<number[][]> {
    if (texts.length === 0) {
        return [];
    }

    const embeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const response = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: batch,
            dimensions: EMBEDDING_DIMENSIONS,
        });

        embeddings.push(...response.data.map(item => item.embedding));

        // Small delay to avoid rate limiting
        if (i + batchSize < texts.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return embeddings;
}

/**
 * Create movie embedding text from movie data
 * Combines title, overview, and genres into searchable text
 */
export function createMovieEmbeddingText(movie: {
    title: string;
    description?: string | null;
    genres?: string[] | null;
}): string {
    const parts: string[] = [movie.title];

    if (movie.description) {
        parts.push(movie.description);
    }

    if (movie.genres && movie.genres.length > 0) {
        parts.push(`Genres: ${movie.genres.join(', ')}`);
    }

    return parts.join('\n\n');
}

