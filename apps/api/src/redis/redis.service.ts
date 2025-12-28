import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private readonly client: Redis;

    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            maxRetriesPerRequest: null, // Required for BullMQ
        });

        this.client.on('connect', () => {
            this.logger.log('✅ Redis connected');
        });

        this.client.on('error', (error) => {
            this.logger.error('❌ Redis connection error:', error);
        });
    }

    getClient(): Redis {
        return this.client;
    }

    async get<T>(key: string): Promise<T | null> {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        const serialized = JSON.stringify(value);
        if (ttl) {
            await this.client.setex(key, ttl, serialized);
        } else {
            await this.client.set(key, serialized);
        }
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async keys(pattern: string): Promise<string[]> {
        return await this.client.keys(pattern);
    }

    async flushAll(): Promise<void> {
        await this.client.flushall();
        this.logger.log('🗑️  Redis cache cleared');
    }

    onModuleDestroy() {
        this.client.disconnect();
    }
}
