import { Module } from '@nestjs/common';
import { TmdbModule } from './tmdb/tmdb.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { MoviesModule } from './movies/movies.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { RedisModule } from './redis/redis.module';
import { QueuesModule } from './queues/queues.module';
import { SmartSearchModule } from './smart-search/smart-search.module';
import { ChatModule } from './chat/chat.module';
import { TvShowsModule } from './tv-shows/tv-shows.module';
import { UsersModule } from './users/users.module';

// Master kill switch for ALL BullMQ queues. When QUEUES_ENABLED=false,
// QueuesModule is not imported at all: no Queue objects, no workers,
// no scheduler, no event listeners — zero BullMQ Redis traffic.
// RedisService stays loaded (caching continues to work).
const queuesEnabled = process.env.QUEUES_ENABLED !== 'false';
const optionalModules = queuesEnabled ? [QueuesModule] : [];

@Module({
    imports: [
        TmdbModule,
        EmbeddingsModule,
        MoviesModule,
        WatchlistModule,
        RecommendationsModule,
        RedisModule,
        ...optionalModules,
        SmartSearchModule,
        ChatModule,
        TvShowsModule,
        UsersModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
