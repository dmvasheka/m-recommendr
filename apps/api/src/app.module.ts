import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TmdbModule } from './tmdb/tmdb.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { MoviesModule } from './movies/movies.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { RedisModule } from './redis/redis.module';
import { QueuesModule } from './queues/queues.module';
import { ChatModule } from './chat/chat.module';
import { TvShowsModule } from './tv-shows/tv-shows.module';
import { UsersModule } from './users/users.module';
import { OmdbModule } from './omdb/omdb.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        TmdbModule,
        EmbeddingsModule,
        MoviesModule,
        WatchlistModule,
        RecommendationsModule,
        RedisModule,
        QueuesModule,
        ChatModule,
        TvShowsModule,
        UsersModule,
        OmdbModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
