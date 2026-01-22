import { Injectable, Logger } from '@nestjs/common';
import { supabase } from '@repo/db';

export type ContentType = 'movies' | 'tv_shows';
export type Category = 'popular' | 'top_rated' | 'now_playing' | 'upcoming';

/**
 * Service for managing category rotation in imports
 * Rotates between: popular → top_rated → now_playing → upcoming
 */
@Injectable()
export class CategoryRotationService {
    private readonly logger = new Logger(CategoryRotationService.name);

    // Category rotation order
    private readonly movieCategories: Category[] = ['popular', 'top_rated', 'now_playing', 'upcoming'];
    private readonly tvCategories: Category[] = ['popular', 'top_rated']; // TV has fewer categories

    /**
     * Get the next category to import based on rotation
     */
    async getNextCategory(contentType: ContentType): Promise<Category> {
        try {
            // Get the last imported category
            const { data: lastImport, error } = await supabase
                .from('import_progress')
                .select('category, last_run')
                .eq('content_type', contentType)
                .is('year', null) // Only category-based imports, not year-based
                .order('last_run', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                this.logger.error(`Error getting last category: ${error.message}`);
            }

            const categories = contentType === 'movies' ? this.movieCategories : this.tvCategories;

            // If no previous import, start with first category
            if (!lastImport) {
                this.logger.log(`No previous ${contentType} import found. Starting with: ${categories[0]}`);
                return categories[0];
            }

            // Find current category index
            const currentIndex = categories.indexOf(lastImport.category as Category);

            // If category not found or last in rotation, go back to first
            if (currentIndex === -1 || currentIndex === categories.length - 1) {
                this.logger.log(`Rotating ${contentType} back to: ${categories[0]}`);
                return categories[0];
            }

            // Get next category
            const nextCategory = categories[currentIndex + 1];
            this.logger.log(`Rotating ${contentType} from ${lastImport.category} to: ${nextCategory}`);
            return nextCategory;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get next category error: ${errorMessage}`);
            // Default to first category on error
            return contentType === 'movies' ? 'popular' : 'popular';
        }
    }

    /**
     * Get rotation status for all content types
     */
    async getRotationStatus(): Promise<{
        movies: { lastCategory: string | null; nextCategory: Category; lastRun: string | null };
        tv_shows: { lastCategory: string | null; nextCategory: Category; lastRun: string | null };
    }> {
        try {
            const [moviesNext, tvNext] = await Promise.all([
                this.getNextCategory('movies'),
                this.getNextCategory('tv_shows'),
            ]);

            // Get last imports
            const [moviesLast, tvLast] = await Promise.all([
                this.getLastImport('movies'),
                this.getLastImport('tv_shows'),
            ]);

            return {
                movies: {
                    lastCategory: moviesLast?.category || null,
                    nextCategory: moviesNext,
                    lastRun: moviesLast?.last_run || null,
                },
                tv_shows: {
                    lastCategory: tvLast?.category || null,
                    nextCategory: tvNext,
                    lastRun: tvLast?.last_run || null,
                },
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Get rotation status error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get last import record for a content type
     */
    private async getLastImport(contentType: ContentType): Promise<{ category: string; last_run: string } | null> {
        const { data } = await supabase
            .from('import_progress')
            .select('category, last_run')
            .eq('content_type', contentType)
            .is('year', null)
            .order('last_run', { ascending: false })
            .limit(1)
            .maybeSingle();

        return data;
    }

    /**
     * Check if it's time to rotate to next category
     * (e.g., if all items in current category have been skipped)
     */
    async shouldRotate(
        contentType: ContentType,
        category: Category,
        recentSkipRate: number
    ): Promise<boolean> {
        // If 80% or more of recent imports were skipped, suggest rotation
        if (recentSkipRate >= 0.8) {
            this.logger.log(
                `High skip rate (${(recentSkipRate * 100).toFixed(1)}%) for ${contentType}/${category}. ` +
                `Suggesting rotation to next category.`
            );
            return true;
        }

        return false;
    }
}
