import { openai, GPT4_MODEL, GPT4O_MINI_MODEL } from './openai.client';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface MovieContext {
    id: number;
    title: string;
    description: string | null;
    genres: string[] | null;
    keywords: string[] | null;
    tagline: string | null;
    movie_cast?: any;
    crew?: any;
    vote_average: number | null;
    release_date: string | null;
}

/**
 * Generate AI response for movie recommendations using RAG
 *
 * @param userMessage - User's question/request
 * @param context - Relevant movies from vector search
 * @param conversationHistory - Previous messages in conversation
 * @returns AI-generated response
 */
export async function generateChatResponse(
    userMessage: string,
    context: MovieContext[],
    conversationHistory: ChatMessage[] = []
): Promise<string> {
    // Format context from movies into readable text
    const formattedContext = context.map((movie, index) => {
        const cast = movie.movie_cast
            ? JSON.parse(movie.movie_cast).map((c: any) => c.name).slice(0, 3).join(', ')
            : 'Unknown';

        const director = movie.crew
            ? JSON.parse(movie.crew).find((c: any) => c.job === 'Director')?.name || 'Unknown'
            : 'Unknown';

        const keywords = movie.keywords?.slice(0, 5).join(', ') || 'N/A';

        return `
  Movie ${index + 1}:
  - Title: ${movie.title} (${movie.release_date?.substring(0, 4) || 'N/A'})
  - Tagline: ${movie.tagline || 'N/A'}
  - Genres: ${movie.genres?.join(', ') || 'N/A'}
  - Description: ${movie.description || 'No description available'}
  - Keywords: ${keywords}
  - Director: ${director}
  - Cast: ${cast}
  - Rating: ${movie.vote_average ? `${movie.vote_average}/10` : 'N/A'}
          `.trim();
    }).join('\n\n');

    // System prompt for movie recommendation assistant
    const systemPrompt = `You are an expert movie recommendation assistant with deep knowledge of cinema. Your role is to help users discover movies they'll love based on their preferences, mood, or specific requests.

  Guidelines:
  1. Use the provided movie context to give personalized recommendations
  2. Explain WHY you're recommending each movie (genre match, similar themes, cast/director, mood)
  3. Be conversational and enthusiastic about movies
  4. If asked about a specific genre/mood/theme, prioritize movies that match
  5. Mention key details: title, year, director, main cast, and what makes it special
  6. Keep responses concise but informative (2-4 movie recommendations per response)
  7. If no relevant context is provided, be honest and suggest the user try different search terms

  Always format your recommendations clearly with movie titles in **bold**.`;

    // Build messages array
    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        {
            role: 'user',
            content: formattedContext
                ? `Based on these movies:\n\n${formattedContext}\n\nUser question: ${userMessage}`
                : userMessage
        }
    ];

    try {
        const response = await openai.chat.completions.create({
            model: GPT4O_MINI_MODEL, // Use GPT-4o-mini for faster/cheaper responses
            messages: messages as any,
            temperature: 0.7, // Balance between creativity and consistency
            max_tokens: 800, // Limit response length
        });

        return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error generating chat response:', errorMessage);
        throw new Error(`Failed to generate AI response: ${errorMessage}`);
    }
}

/**
 * Generate a concise summary of movie for context window
 */
export function summarizeMovie(movie: MovieContext): string {
    return `${movie.title} (${movie.release_date?.substring(0, 4) || 'N/A'}) - ${movie.genres?.join(', ') || 'N/A'} - ${movie.description?.substring(0, 100)}...`;
}
