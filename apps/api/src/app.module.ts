import { Module } from '@nestjs/common';
import { TmdbModule } from './tmdb/tmdb.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { MoviesModule } from './movies/movies.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { RedisModule } from './redis/redis.module';
// import { QueuesModule } from './queues/queues.module'; // DISABLED: BullMQ workers consuming too much Redis operations (500k/day)
import { ChatModule } from './chat/chat.module';

@Module({
    imports: [
        TmdbModule,
        EmbeddingsModule,
        MoviesModule,
        WatchlistModule,
        RecommendationsModule,
        RedisModule,
        // QueuesModule, // DISABLED: BullMQ workers consuming too much Redis operations (500k/day)
        ChatModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
