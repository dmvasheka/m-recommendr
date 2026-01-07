import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
// import { setupBullBoard } from './queues/bull-board.setup'; // DISABLED: QueuesModule is disabled
// import { Queue } from 'bullmq'; // DISABLED: QueuesModule is disabled

// Load .env from root of monorepo (only in development)
if (process.env.NODE_ENV !== 'production') {
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.join(__dirname, '../../../.env') });
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const logger = new Logger('Bootstrap');

    // Enable CORS for frontend access (supports multiple origins)
    app.enableCors({
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3002'],
        credentials: true,
    });

    // Global API prefix
    app.setGlobalPrefix('api');

    // DISABLED: Bull Board UI - QueuesModule is disabled to reduce Redis operations
    // try {
    //     const movieImportQueue = app.get<Queue>('BullQueue_movie-import');
    //     const embeddingQueue = app.get<Queue>('BullQueue_embedding-generation');

    //     const serverAdapter = setupBullBoard([movieImportQueue, embeddingQueue]);

    //     app.use('/admin/queues', serverAdapter.getRouter());

    //     logger.log('📊 Bull Board UI available at: http://localhost:3001/admin/queues');
    // } catch (error) {
    //     const errorMessage = error instanceof Error ? error.message : String(error);
    //     logger.warn('⚠️  Bull Board setup failed:', errorMessage);
    // }


    const port = process.env.PORT || process.env.API_PORT || 3001;
    await app.listen(port);

    logger.log(`🚀 API Server running on port: ${port}`);
    logger.log(`📚 TMDB endpoints: http://localhost:${port}/api/tmdb`);
}

bootstrap();

