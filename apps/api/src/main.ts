import './dotenv-loader';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
// import { setupBullBoard } from './queues/bull-board.setup'; // DISABLED: QueuesModule is disabled
// import { Queue } from 'bullmq'; // DISABLED: QueuesModule is disabled

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const logger = new Logger('Bootstrap');

    // Enable CORS for frontend access (supports multiple origins)
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || ['http://localhost:3002'];
    app.enableCors({
        origin: (origin, callback) => {
            // Allow requests with no origin (same-origin, server-to-server, non-browser clients)
            // Note: CSRF protection should be handled separately via tokens or SameSite cookies
            if (!origin) {
                logger.debug('Allowing request with no Origin header (same-origin or non-browser client)');
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                logger.warn(`Blocked CORS request from origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type,Authorization,Accept',
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

