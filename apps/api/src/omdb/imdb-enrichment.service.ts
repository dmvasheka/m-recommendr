import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { supabase } from '@repo/db';
import { OmdbService } from './omdb.service';

@Injectable()
export class ImdbEnrichmentService {
    private readonly logger = new Logger(ImdbEnrichmentService.name);
    private readonly batchSize = 50; // Process 50 items per cron run
    private readonly dailyLimit = 900; // Keep some buffer from 1000 daily limit
    private dailyRequestCount = 0;
    private lastResetDate = new Date().toDateString();
    private isRunning = false;

    constructor(private readonly omdbService: OmdbService) {}

    /**
     * Reset daily counter at midnight
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'imdb-reset-daily-counter' })
    resetDailyCounter() {
        this.dailyRequestCount = 0;
        this.lastResetDate = new Date().toDateString();
        this.logger.log('Daily OMDb request counter reset');
    }

    /**
     * Enrich movies with IMDb ratings - runs every 2 hours
     */
    @Cron(CronExpression.EVERY_2_HOURS, { name: 'imdb-enrichment-job' })
    async enrichMoviesWithImdbRatings() {
        if (!this.omdbService.isConfigured()) {
            this.logger.debug('OMDb not configured, skipping enrichment');
            return;
        }

        if (this.isRunning) {
            this.logger.debug('Enrichment already running, skipping');
            return;
        }

        // Check daily limit
        if (this.dailyRequestCount >= this.dailyLimit) {
            this.logger.warn(`Daily OMDb limit reached (${this.dailyRequestCount}/${this.dailyLimit})`);
            return;
        }

        this.isRunning = true;

        try {
            await this.enrichMovies();
            await this.enrichTvShows();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Enrichment error: ${errorMessage}`);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Enrich movies that have imdb_id but no imdb_rating
     */
    private async enrichMovies() {
        // First, get movies with imdb_id but no rating (prioritize by popularity)
        const { data: movies, error } = await supabase
            .from('movies')
            .select('id, title, release_date, imdb_id')
            .not('imdb_id', 'is', null)
            .is('imdb_rating', null)
            .order('popularity', { ascending: false })
            .limit(this.batchSize);

        if (error) {
            this.logger.error(`Error fetching movies for enrichment: ${error.message}`);
            return;
        }

        if (!movies || movies.length === 0) {
            this.logger.debug('No movies need IMDb enrichment with existing imdb_id');
            return;
        }

        this.logger.log(`Enriching ${movies.length} movies with IMDb ratings (by imdb_id)`);

        let enriched = 0;
        for (const movie of movies as any[]) {
            if (this.dailyRequestCount >= this.dailyLimit) break;

            const imdbData = await this.omdbService.getByImdbId(movie.imdb_id);
            this.dailyRequestCount++;

            if (imdbData && imdbData.imdb_rating !== null) {
                const { error: updateError } = await (supabase
                    .from('movies') as any)
                    .update({
                        imdb_rating: imdbData.imdb_rating,
                        imdb_votes: imdbData.imdb_votes,
                    })
                    .eq('id', movie.id);

                if (!updateError) {
                    enriched++;
                    this.logger.debug(`Updated movie ${movie.id}: IMDb ${imdbData.imdb_rating}`);
                }
            }
        }

        this.logger.log(`Enriched ${enriched}/${movies.length} movies with IMDb ratings`);
    }

    /**
     * Enrich TV shows that have imdb_id but no imdb_rating
     */
    private async enrichTvShows() {
        const { data: tvShows, error } = await supabase
            .from('tv_shows')
            .select('id, name, first_air_date, imdb_id')
            .not('imdb_id', 'is', null)
            .is('imdb_rating', null)
            .order('popularity', { ascending: false })
            .limit(this.batchSize);

        if (error) {
            this.logger.error(`Error fetching TV shows for enrichment: ${error.message}`);
            return;
        }

        if (!tvShows || tvShows.length === 0) {
            this.logger.debug('No TV shows need IMDb enrichment with existing imdb_id');
            return;
        }

        this.logger.log(`Enriching ${tvShows.length} TV shows with IMDb ratings`);

        let enriched = 0;
        for (const tvShow of tvShows as any[]) {
            if (this.dailyRequestCount >= this.dailyLimit) break;

            const imdbData = await this.omdbService.getByImdbId(tvShow.imdb_id);
            this.dailyRequestCount++;

            if (imdbData && imdbData.imdb_rating !== null) {
                const { error: updateError } = await (supabase
                    .from('tv_shows') as any)
                    .update({
                        imdb_rating: imdbData.imdb_rating,
                        imdb_votes: imdbData.imdb_votes,
                    })
                    .eq('id', tvShow.id);

                if (!updateError) {
                    enriched++;
                    this.logger.debug(`Updated TV show ${tvShow.id}: IMDb ${imdbData.imdb_rating}`);
                }
            }
        }

        this.logger.log(`Enriched ${enriched}/${tvShows.length} TV shows with IMDb ratings`);
    }

    /**
     * Manual trigger for enrichment (useful for testing)
     */
    async triggerEnrichment(): Promise<{ movies: number; tvShows: number; requestsUsed: number }> {
        const startCount = this.dailyRequestCount;

        await this.enrichMovies();
        await this.enrichTvShows();

        return {
            movies: 0, // Would need to track this separately
            tvShows: 0,
            requestsUsed: this.dailyRequestCount - startCount,
        };
    }

    /**
     * Get current status
     */
    getStatus(): { dailyRequestCount: number; dailyLimit: number; isRunning: boolean } {
        return {
            dailyRequestCount: this.dailyRequestCount,
            dailyLimit: this.dailyLimit,
            isRunning: this.isRunning,
        };
    }
}
