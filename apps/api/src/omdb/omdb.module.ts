import { Module } from '@nestjs/common';
import { OmdbService } from './omdb.service';
import { ImdbEnrichmentService } from './imdb-enrichment.service';
import { OmdbController } from './omdb.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [RedisModule],
    controllers: [OmdbController],
    providers: [OmdbService, ImdbEnrichmentService],
    exports: [OmdbService, ImdbEnrichmentService],
})
export class OmdbModule {}
