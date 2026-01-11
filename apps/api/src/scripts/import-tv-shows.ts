import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TmdbService } from '../tmdb/tmdb.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('ImportTVShows');
  
  // Create application context without starting the server
  const app = await NestFactory.createApplicationContext(AppModule);
  const tmdbService = app.get(TmdbService);

  const startYear = 2010;
  const endYear = new Date().getFullYear(); // 2026
  const countPerYear = 50; // Import top 50 shows per year

  logger.log(`Starting TV Shows import from ${startYear} to ${endYear}...`);

  for (let year = startYear; year <= endYear; year++) {
    try {
      logger.log(`Processing year ${year}...`);
      await tmdbService.importTvShowsByYear(year, countPerYear);
      logger.log(`✅ Year ${year} completed successfully.`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`❌ Failed to import year ${year}: ${errorMessage}`);
    }
    
    // Cool down between years
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  logger.log('🎉 Full import sequence completed!');
  await app.close();
}

bootstrap();
