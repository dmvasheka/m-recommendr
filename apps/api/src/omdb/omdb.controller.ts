import { Controller, Post, Get } from '@nestjs/common';
import { ImdbEnrichmentService } from './imdb-enrichment.service';
import { OmdbService } from './omdb.service';

@Controller('omdb')
export class OmdbController {
    constructor(
        private readonly enrichmentService: ImdbEnrichmentService,
        private readonly omdbService: OmdbService,
    ) {}

    /**
     * Manually trigger IMDb enrichment
     */
    @Post('enrich')
    async triggerEnrichment() {
        if (!this.omdbService.isConfigured()) {
            return {
                success: false,
                message: 'OMDb API key not configured',
            };
        }

        // Run enrichment (non-blocking)
        this.enrichmentService.enrichMoviesWithImdbRatings();

        return {
            success: true,
            message: 'IMDb enrichment started in background',
            status: this.enrichmentService.getStatus(),
        };
    }

    /**
     * Get enrichment status
     */
    @Get('status')
    getStatus() {
        return {
            configured: this.omdbService.isConfigured(),
            ...this.enrichmentService.getStatus(),
        };
    }
}
