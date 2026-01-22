import { Controller, Get, Patch, Param, Body, Logger } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    private readonly logger = new Logger(UsersController.name);

    constructor(private readonly usersService: UsersService) {}

    /**
     * GET /api/users/:userId/language
     * Get user's preferred language
     */
    @Get(':userId/language')
    async getLanguagePreference(@Param('userId') userId: string) {
        try {
            const language = await this.usersService.getLanguagePreference(userId);
            return {
                success: true,
                language,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get language preference failed: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
                language: 'en', // fallback
            };
        }
    }

    /**
     * PATCH /api/users/:userId/language
     * Update user's preferred language
     */
    @Patch(':userId/language')
    async updateLanguagePreference(
        @Param('userId') userId: string,
        @Body() body: { language: string },
    ) {
        try {
            await this.usersService.updateLanguagePreference(userId, body.language);
            return {
                success: true,
                message: 'Language preference updated',
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Update language preference failed: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
}
