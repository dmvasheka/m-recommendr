import { Module } from '@nestjs/common';
import { TvShowsService } from './tv-shows.service';
import { TvShowsController } from './tv-shows.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [TvShowsController],
  providers: [TvShowsService],
  exports: [TvShowsService],
})
export class TvShowsModule {}
