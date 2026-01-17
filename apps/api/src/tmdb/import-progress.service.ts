import { Injectable, Logger } from '@nestjs/common';
import { supabase } from '@repo/db';

export interface ImportProgress {
    id: string;
    content_type: 'movies' | 'tv_shows';
    category: string;
    year?: number | null;
    last_page: number;
    last_run: string;
    total_imported: number;
    total_skipped: number;
    notes?: string | null;
}

@Injectable()
export class ImportProgressService {
    private readonly logger = new Logger(ImportProgressService.name);

    /**
     * Get the next page to import for a given content type and category
     */
    async getNextPage(
        contentType: 'movies' | 'tv_shows',
        category: string,
        year?: number
    ): Promise<number> {
        try {
            const { data, error } = await (supabase as any).rpc('get_next_import_page', {
                p_content_type: contentType,
                p_category: category,
                p_year: year || null,
            });

            if (error) {
                this.logger.error(`Error getting next page: ${error.message}`);
                return 1; // Fallback to page 1
            }

            const nextPage = data || 1;
            this.logger.debug(`Next page for ${contentType}/${category}${year ? `/${year}` : ''}: ${nextPage}`);
            return nextPage;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get next page error: ${errorMessage}`);
            return 1; // Fallback to page 1
        }
    }

    /**
     * Update import progress after processing a page
     */
    async updateProgress(
        contentType: 'movies' | 'tv_shows',
        category: string,
        lastPage: number,
        imported: number,
        skipped: number,
        year?: number
    ): Promise<void> {
        try {
            const { error } = await (supabase as any).rpc('update_import_progress', {
                p_content_type: contentType,
                p_category: category,
                p_year: year || null,
                p_last_page: lastPage,
                p_imported: imported,
                p_skipped: skipped,
            });

            if (error) {
                this.logger.error(`Error updating progress: ${error.message}`);
                throw error;
            }

            this.logger.log(
                `✅ Updated progress: ${contentType}/${category}${year ? `/${year}` : ''} - Page ${lastPage} (imported: ${imported}, skipped: ${skipped})`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Update progress error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get all import progress records
     */
    async getAllProgress(): Promise<ImportProgress[]> {
        try {
            const { data, error } = await supabase
                .from('import_progress')
                .select('*')
                .order('last_run', { ascending: false });

            if (error) {
                this.logger.error(`Error getting all progress: ${error.message}`);
                return [];
            }

            return data || [];
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get all progress error: ${errorMessage}`);
            return [];
        }
    }

    /**
     * Get progress for a specific import configuration
     */
    async getProgress(
        contentType: 'movies' | 'tv_shows',
        category: string,
        year?: number
    ): Promise<ImportProgress | null> {
        try {
            let query = supabase
                .from('import_progress')
                .select('*')
                .eq('content_type', contentType)
                .eq('category', category);

            if (year) {
                query = query.eq('year', year);
            } else {
                query = query.is('year', null);
            }

            const { data, error } = await query.maybeSingle();

            if (error) {
                this.logger.error(`Error getting progress: ${error.message}`);
                return null;
            }

            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get progress error: ${errorMessage}`);
            return null;
        }
    }

    /**
     * Reset progress for a specific import configuration
     */
    async resetProgress(
        contentType: 'movies' | 'tv_shows',
        category: string,
        year?: number
    ): Promise<void> {
        try {
            let query = supabase
                .from('import_progress')
                .delete()
                .eq('content_type', contentType)
                .eq('category', category);

            if (year) {
                query = query.eq('year', year);
            } else {
                query = query.is('year', null);
            }

            const { error } = await query;

            if (error) {
                this.logger.error(`Error resetting progress: ${error.message}`);
                throw error;
            }

            this.logger.log(`Reset progress for ${contentType}/${category}${year ? `/${year}` : ''}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Reset progress error: ${errorMessage}`);
            throw error;
        }
    }
}
