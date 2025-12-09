import { Module } from '@nestjs/common';
import { TmdbModule } from './tmdb/tmdb.module';

@Module({
    imports: [TmdbModule],
    controllers: [],
    providers: [],
})
export class AppModule {}

