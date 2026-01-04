import { Injectable, Logger } from '@nestjs/common';
import { supabase } from '@repo/db';
import {
    generateEmbedding,
    generateChatResponse,
    MovieContext,
    ChatMessage,
    UserPreferences,
    detectMood,
    scoreMoodMatch,
    MoodKeywords
} from '@repo/ai';

export interface SendMessageDto {
    userId: string;
    message: string;
    conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
    userMessage: string;
    aiResponse: string;
    contextMovies: number[];
    timestamp: string;
}

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    /**
     * Get user's top-rated movies for personalization
     * (Movies with rating >= 7)
     */
    private async getUserPreferences(userId: string): Promise<UserPreferences | null> {
        try {
            // Fixed Supabase query - correct join syntax
            const { data: watchlist, error } = await supabase
                .from('user_watchlist')
                .select('rating, movies!inner(title, genres)')  // Fixed: movies!inner instead of movie:movies
                .eq('user_id', userId)
                .eq('status', 'watched')
                .gte('rating', 7)
                .order('rating', { ascending: false })
                .limit(5); // Top 5 rated movies

            if (error) {
                this.logger.warn(`Supabase error fetching preferences: ${error.message}`);
                return null;
            }

            if (!watchlist || watchlist.length === 0) {
                this.logger.log(`No top-rated movies found for user ${userId}`);
                return null;
            }

            // Map the response correctly
            const topRatedMovies = watchlist
                .filter((item: any) => item.movies)  // Changed from item.movie to item.movies
                .map((item: any) => ({
                    title: item.movies.title,        // Changed from item.movie.title
                    rating: item.rating,
                    genres: item.movies.genres || [], // Changed from item.movie.genres
                }));

            if (topRatedMovies.length === 0) {
                return null;
            }

            this.logger.log(`Found ${topRatedMovies.length} top-rated movies for user ${userId}`);
            return { topRatedMovies };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to fetch user preferences: ${errorMessage}`);
            return null; // Don't fail if preferences unavailable
        }
    }


    /**
     * Process user message and generate AI response using RAG
     */
    async sendMessage(dto: SendMessageDto): Promise<ChatResponse> {
        try {
            this.logger.log(`Processing chat message for user ${dto.userId}`);

            // 1. Generate embedding for user's question
            const queryEmbedding = await generateEmbedding(dto.message);

            // 2. Vector search: Find relevant movies
            const { data: relevantMovies, error: searchError } = await (supabase.rpc as any)(
                'match_movies',
                {
                    query_embedding: JSON.stringify(queryEmbedding),
                    match_count: 10, // Get top 10 relevant movies
                }
            );

            if (searchError) {
                throw searchError;
            }

            this.logger.log(`Found ${relevantMovies?.length || 0} relevant movies`);

            const detectedMood = detectMood(dto.message);
            if (detectedMood) {
                this.logger.log(`Detected mood: ${detectedMood.mood}`);
            }


            // 3. Fetch full enriched metadata for context
            const movieIds = (relevantMovies || []).map((m: any) => m.id);
            const { data: enrichedMovies, error: enrichError } = await supabase
                .from('movies')
                .select('id, title, description, genres, keywords, tagline, movie_cast, crew, vote_average, release_date')
                .in('id', movieIds);

            if (enrichError) {
                throw enrichError;
            }

            let context: MovieContext[] = (enrichedMovies || []) as any[];

            // NEW: Fetch conversation history if not provided
            let conversationHistory = dto.conversationHistory || [];
            if (!conversationHistory || conversationHistory.length === 0) {
                conversationHistory = await this.getConversationHistory(dto.userId, 10); // Last 10 messages
                if (conversationHistory.length > 0) {
                    this.logger.log(`Loaded ${conversationHistory.length} previous messages for context`);
                }
            }

            const userPreferences = await this.getUserPreferences(dto.userId);
            if (userPreferences) {
                this.logger.log(`Using personalized context for user ${dto.userId}`);
            }

            if (detectedMood && context.length > 0) {
                context = context
                    .map(movie => ({
                        ...movie,
                        moodScore: scoreMoodMatch(movie, detectedMood)
                    }))
                    .sort((a, b) => (b.moodScore || 0) - (a.moodScore || 0))
                    .slice(0, 10); // Keep top 10 mood-matching movies

                this.logger.log(`Re-ranked ${context.length} movies by mood: ${detectedMood.mood}`);
            }

            // 4. Generate AI response using RAG with personalization + history
            const aiResponse = await generateChatResponse(
                dto.message,
                context,
                conversationHistory, // NOW includes previous messages
                userPreferences || undefined,
                detectedMood || undefined
            );

            // 5. Save conversation to database
            const { data: savedMessage, error: saveError } = await (supabase
                .from('chat_messages')
                .insert({
                    user_id: dto.userId,
                    user_message: dto.message,
                    ai_response: aiResponse,
                    context_movies: movieIds,
                } as any)
                .select()
                .single() as any);

            if (saveError) {
                this.logger.warn(`Failed to save chat message: ${saveError.message}`);
                // Don't throw - still return response even if save fails
            }

            this.logger.log(`✅ Generated AI response for user ${dto.userId}`);

            return {
                userMessage: dto.message,
                aiResponse,
                contextMovies: movieIds,
                timestamp: savedMessage ? savedMessage.created_at : new Date().toISOString(),
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Chat service error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get conversation history for a user
     */
    async getConversationHistory(
        userId: string,
        limit = 20
    ): Promise<ChatMessage[]> {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('user_message, ai_response, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: true })
                .limit(limit);

            if (error) {
                throw error;
            }

            // Convert to ChatMessage format
            const history: ChatMessage[] = [];
            (data || []).forEach((msg: any) => {
                history.push(
                    { role: 'user', content: msg.user_message },
                    { role: 'assistant', content: msg.ai_response }
                );
            });

            return history;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get history error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Clear conversation history for a user
     */
    async clearConversationHistory(userId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('chat_messages')
                .delete()
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            this.logger.log(`Cleared conversation history for user ${userId}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Clear history error: ${errorMessage}`);
            throw error;
        }
    }
}
