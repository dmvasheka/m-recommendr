import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from '../redis/redis.service';

export interface OmdbMovieData {
    imdbID: string;
    imdbRating: string;
    imdbVotes: string;
    Title: string;
    Year: string;
    Type: string;
    Response: string;
    Error?: string;
}

export interface ImdbRatingData {
    imdb_id: string;
    imdb_rating: number | null;
    imdb_votes: number | null;
}

@Injectable()
export class OmdbService {
    private readonly logger = new Logger(OmdbService.name);
    private readonly apiKey = process.env.OMDB_API_KEY;
    private readonly baseUrl = 'http://www.omdbapi.com';
    private readonly cacheTtl = 60 * 60 * 24 * 7; // 7 days in seconds
    private lastRequestTime = 0;
    private readonly minRequestInterval = 1100; // 1.1 seconds between requests (rate limiting)

    constructor(private readonly redisService: RedisService) {}

    onModuleInit() {
        if (!this.apiKey) {
            this.logger.warn('OMDB_API_KEY is not set - IMDb ratings will not be available');
        } else {
            this.logger.log('OMDb service initialized');
        }
    }

    /**
     * Rate limiting: ensure minimum interval between requests
     */
    private async waitForRateLimit(): Promise<void> {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        if (elapsed < this.minRequestInterval) {
            await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - elapsed));
        }
        this.lastRequestTime = Date.now();
    }

    /**
     * Get movie/TV show data by IMDb ID
     */
    async getByImdbId(imdbId: string): Promise<ImdbRatingData | null> {
        if (!this.apiKey) {
            return null;
        }

        try {
            // Check cache first
            const cacheKey = `omdb:${imdbId}`;
            const cached = await this.redisService.get<ImdbRatingData>(cacheKey);
            if (cached) {
                this.logger.debug(`Cache HIT for OMDb ${imdbId}`);
                return cached;
            }

            // Rate limit
            await this.waitForRateLimit();

            // Fetch from OMDb API
            const response = await axios.get<OmdbMovieData>(this.baseUrl, {
                params: {
                    apikey: this.apiKey,
                    i: imdbId,
                },
                timeout: 10000,
            });

            const data = response.data;

            if (data.Response === 'False') {
                this.logger.warn(`OMDb error for ${imdbId}: ${data.Error}`);
                return null;
            }

            const result: ImdbRatingData = {
                imdb_id: data.imdbID,
                imdb_rating: data.imdbRating && data.imdbRating !== 'N/A'
                    ? parseFloat(data.imdbRating)
                    : null,
                imdb_votes: data.imdbVotes && data.imdbVotes !== 'N/A'
                    ? parseInt(data.imdbVotes.replace(/,/g, ''), 10)
                    : null,
            };

            // Cache the result
            await this.redisService.set(cacheKey, result, this.cacheTtl);
            this.logger.log(`Fetched OMDb data for ${imdbId}: rating=${result.imdb_rating}`);

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`OMDb API error for ${imdbId}: ${errorMessage}`);
            return null;
        }
    }

    /**
     * Search for movie/TV show by title and optional year
     */
    async searchByTitle(title: string, year?: number, type?: 'movie' | 'series'): Promise<ImdbRatingData | null> {
        if (!this.apiKey) {
            return null;
        }

        try {
            // Create cache key
            const cacheKey = `omdb:search:${title.toLowerCase()}:${year || ''}:${type || ''}`;
            const cached = await this.redisService.get<ImdbRatingData>(cacheKey);
            if (cached) {
                this.logger.debug(`Cache HIT for OMDb search "${title}"`);
                return cached;
            }

            // Rate limit
            await this.waitForRateLimit();

            // Fetch from OMDb API
            const params: Record<string, string | number> = {
                apikey: this.apiKey,
                t: title,
            };
            if (year) params.y = year;
            if (type) params.type = type;

            const response = await axios.get<OmdbMovieData>(this.baseUrl, {
                params,
                timeout: 10000,
            });

            const data = response.data;

            if (data.Response === 'False') {
                this.logger.debug(`OMDb not found: "${title}" (${year})`);
                return null;
            }

            const result: ImdbRatingData = {
                imdb_id: data.imdbID,
                imdb_rating: data.imdbRating && data.imdbRating !== 'N/A'
                    ? parseFloat(data.imdbRating)
                    : null,
                imdb_votes: data.imdbVotes && data.imdbVotes !== 'N/A'
                    ? parseInt(data.imdbVotes.replace(/,/g, ''), 10)
                    : null,
            };

            // Cache the result
            await this.redisService.set(cacheKey, result, this.cacheTtl);
            this.logger.log(`Found OMDb data for "${title}": ${result.imdb_id}, rating=${result.imdb_rating}`);

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`OMDb search error for "${title}": ${errorMessage}`);
            return null;
        }
    }

    /**
     * Check if OMDb service is configured
     */
    isConfigured(): boolean {
        return !!this.apiKey;
    }
}
