import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TmdbService } from '../../tmdb/tmdb.service';
import { MovieImportJob } from '../queues.service';

@Processor('movie-import')
export class MovieImportProcessor extends WorkerHost {
    private readonly logger = new Logger(MovieImportProcessor.name);

    constructor(private readonly tmdbService: TmdbService) {
        super();
    }

    async process(job: Job<MovieImportJob>): Promise<any> {
        const { count, page } = job.data;

        this.logger.log(`🎬 Starting movie import: ${count} movies (page: ${page || 1})`);

        try {
            // Обновляем прогресс
            await job.updateProgress(0);

            // Импортируем фильмы
            const result = await this.tmdbService.importPopularMovies(count, page);

            await job.updateProgress(100);

            this.logger.log(`✅ Movie import completed: ${result.imported} imported, ${result.skipped} skipped`);

            return {
                success: true,
                imported: result.imported,
                skipped: result.skipped,
            };
        } catch (error) {
            this.logger.error(`❌ Movie import failed: ${error.message}`);
            throw error; // BullMQ автоматически сделает retry
        }
    }
}
