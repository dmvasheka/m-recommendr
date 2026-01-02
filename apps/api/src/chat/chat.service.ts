import { Injectable, Logger } from '@nestjs/common';
import { supabase } from '@repo/db';
import { generateEmbedding, generateChatResponse, MovieContext, ChatMessage } from '@repo/ai';

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

            // 3. Fetch full enriched metadata for context
            const movieIds = (relevantMovies || []).map((m: any) => m.id);
            const { data: enrichedMovies, error: enrichError } = await supabase
                .from('movies')
                .select('id, title, description, genres, keywords, tagline, movie_cast, crew, vote_average, release_date')
                .in('id', movieIds);

            if (enrichError) {
                throw enrichError;
            }

            const context: MovieContext[] = (enrichedMovies || []) as any[];

            // 4. Generate AI response using RAG
            const aiResponse = await generateChatResponse(
                dto.message,
                context,
                dto.conversationHistory || []
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
