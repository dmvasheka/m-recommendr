import { Module } from '@nestjs/common';
import { TmdbService } from './tmdb.service';
import { TmdbController } from './tmdb.controller';
import { EmbeddingsModule } from '../embeddings/embeddings.module'; // Import EmbeddingsModule

@Module({
    imports: [EmbeddingsModule], // Add EmbeddingsModule to imports
    controllers: [TmdbController],
    providers: [TmdbService],
    exports: [TmdbService], // Экспортируем для использования в других модулях
})
export class TmdbModule {}

