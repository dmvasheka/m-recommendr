import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TmdbService } from '../../tmdb/tmdb.service';
import { TvImportJob } from '../queues.service';

@Processor('tv-import')
export class TvImportProcessor extends WorkerHost {
    private readonly logger = new Logger(TvImportProcessor.name);

    constructor(private readonly tmdbService: TmdbService) {
        super();
    }

    async process(job: Job<TvImportJob>): Promise<any> {
        const { year, count, page } = job.data;

        this.logger.log(`📺 Starting TV show import: ${count} shows for year ${year} (page: ${page || 1})`);

        try {
            // Update progress
            await job.updateProgress(0);

            // Import TV shows
            const result = await this.tmdbService.importTvShowsByYear(year, count, page);

            await job.updateProgress(100);

            this.logger.log(`✅ TV show import completed: ${result.imported} imported, ${result.skipped} skipped`);

            return {
                success: true,
                imported: result.imported,
                skipped: result.skipped,
                lastPage: result.lastPage,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ TV show import failed: ${errorMessage}`);
            throw error; // BullMQ will automatically retry
        }
    }
}
