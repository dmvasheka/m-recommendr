import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [RedisModule],
    providers: [],
    exports: [],
})
export class SmartSearchModule {}
