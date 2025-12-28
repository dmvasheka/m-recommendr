import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RedisService } from '../redis/redis.service';
import { QueuesService } from './queues.service';
import { MovieImportProcessor } from './processors/movie-import.processor';
import { EmbeddingProcessor } from './processors/embedding.processor';
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
            { name: 'embedding-generation' },
        ),
    ],
    controllers: [QueuesController],
    providers: [QueuesService, MovieImportProcessor, EmbeddingProcessor],
    exports: [QueuesService],
})
export class QueuesModule {}
