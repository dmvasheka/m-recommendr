import { Module } from '@nestjs/common';
import { TmdbModule } from './tmdb/tmdb.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { MoviesModule } from './movies/movies.module';
import { WatchlistModule } from './watchlist/watchlist.module';

@Module({
    imports: [TmdbModule, EmbeddingsModule, MoviesModule,
        WatchlistModule],
    controllers: [],
    providers: [],
})
export class AppModule {}



