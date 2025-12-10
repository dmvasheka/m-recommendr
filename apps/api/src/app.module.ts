import { Module } from '@nestjs/common';
import { TmdbModule } from './tmdb/tmdb.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { MoviesModule } from './movies/movies.module';

@Module({
    imports: [TmdbModule, EmbeddingsModule, MoviesModule],
    controllers: [],
    providers: [],
})
export class AppModule {}



