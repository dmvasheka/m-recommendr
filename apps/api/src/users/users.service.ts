import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);
    private supabase = createClient(supabaseUrl, supabaseServiceKey);

    /**
     * Get user's preferred language
     */
    async getLanguagePreference(userId: string): Promise<string> {
        const { data, error } = await this.supabase
            .from('users')
            .select('preferred_language')
            .eq('id', userId)
            .single();

        if (error) {
            this.logger.error(`Failed to get language preference for user ${userId}: ${error.message}`);
            throw new NotFoundException(`User not found`);
        }

        return data?.preferred_language || 'en';
    }

    /**
     * Update user's preferred language
     */
    async updateLanguagePreference(userId: string, language: string): Promise<void> {
        // Validate language
        const validLanguages = ['en', 'ru', 'uk'];
        if (!validLanguages.includes(language)) {
            throw new Error(`Invalid language: ${language}. Must be one of: ${validLanguages.join(', ')}`);
        }

        const { error } = await this.supabase
            .from('users')
            .update({ preferred_language: language, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            this.logger.error(`Failed to update language preference for user ${userId}: ${error.message}`);
            throw new Error('Failed to update language preference');
        }

        this.logger.log(`Updated language preference for user ${userId} to ${language}`);
    }
}
