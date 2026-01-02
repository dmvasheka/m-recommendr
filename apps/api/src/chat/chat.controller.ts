import { Controller, Post, Get, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
    private readonly logger = new Logger(ChatController.name);

    constructor(private readonly chatService: ChatService) {}

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
            const history = await this.chatService.getConversationHistory(
                userId,
                limit ? parseInt(limit) : 20
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
