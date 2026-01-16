import { Controller, Post, Get, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
    private readonly logger = new Logger(ChatController.name);
    private readonly MAX_LIMIT = 100;
    private readonly DEFAULT_HISTORY_LIMIT = 20;

    constructor(private readonly chatService: ChatService) {}

    /**
     * Parse and validate limit parameter
     */
    private parseLimit(limit: string | undefined, defaultValue: number = this.DEFAULT_HISTORY_LIMIT): number {
        if (!limit) return defaultValue;

        const parsed = parseInt(limit, 10);
        if (isNaN(parsed) || !isFinite(parsed) || parsed < 1) {
            return defaultValue;
        }

        return Math.min(parsed, this.MAX_LIMIT);
    }

    /**
     * POST /api/chat
     * Send a message and get AI response
     */
    @Post()
    async sendMessage(
        @Body() body: {
            userId: string;
            message: string;
            includeHistory?: boolean;
        }
    ) {
        try {
            // Optionally include conversation history for context
            const conversationHistory = body.includeHistory
                ? await this.chatService.getConversationHistory(body.userId, 10)
                : undefined;

            const response = await this.chatService.sendMessage({
                userId: body.userId,
                message: body.message,
                conversationHistory,
            });

            return {
                success: true,
                ...response,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Send message error: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * GET /api/chat/history/:userId
     * Get conversation history
     */
    @Get('history/:userId')
    async getHistory(
        @Param('userId') userId: string,
        @Query('limit') limit?: string
    ) {
        try {
            const validatedLimit = this.parseLimit(limit);
            const history = await this.chatService.getConversationHistory(
                userId,
                validatedLimit
            );

            return {
                success: true,
                history,
                count: history.length,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * DELETE /api/chat/clear/:userId
     * Clear conversation history
     */
    @Delete('clear/:userId')
    async clearHistory(@Param('userId') userId: string) {
        try {
            await this.chatService.clearConversationHistory(userId);

            return {
                success: true,
                message: 'Conversation history cleared',
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
}
