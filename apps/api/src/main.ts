import * as dotenv from 'dotenv';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

// Load .env from root of monorepo
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const logger = new Logger('Bootstrap');

    // Enable CORS for frontend access
    app.enableCors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    });

    // Global API prefix
    app.setGlobalPrefix('api');

    const port = process.env.API_PORT || 3001;
    await app.listen(port);

    logger.log(`🚀 API Server running on: http://localhost:${port}/api`);
    logger.log(`📚 TMDB endpoints: http://localhost:${port}/api/tmdb`);
}

bootstrap();

