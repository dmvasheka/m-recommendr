import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RedisService } from '../redis/redis.service';
import { QueuesService } from './queues.service';
import { MovieImportProcessor } from './processors/movie-import.processor';
import { TvImportProcessor } from './processors/tv-import.processor';
import { EmbeddingProcessor } from './processors/embedding.processor';
import { TranslationUpdateProcessor } from './processors/translation-update.processor';
import { ImdbUpdateProcessor } from './processors/imdb-update.processor';
import { TmdbModule } from '../tmdb/tmdb.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { QueuesController } from './queues.controller';

@Module({
    imports: [
        TmdbModule,
        EmbeddingsModule,
        BullModule.forRootAsync({
            inject: [RedisService],
            useFactory: (redisService: RedisService) => ({
                connection: redisService.getClient(),
            }),
        }),
        BullModule.registerQueue(
            { name: 'movie-import' },
            { name: 'tv-import' },
            { name: 'embedding-generation' },
            { name: 'translation-update' },
            { name: 'imdb-update' },
        ),
    ],
    controllers: [QueuesController],
    providers: [QueuesService, MovieImportProcessor, TvImportProcessor, EmbeddingProcessor, TranslationUpdateProcessor, ImdbUpdateProcessor],
    exports: [QueuesService],
})
export class QueuesModule {}
