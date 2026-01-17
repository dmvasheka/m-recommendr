import { Module } from '@nestjs/common';
import { TmdbService } from './tmdb.service';
import { TmdbController } from './tmdb.controller';
import { ImportProgressService } from './import-progress.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module'; // Import EmbeddingsModule

@Module({
    imports: [EmbeddingsModule], // Add EmbeddingsModule to imports
    controllers: [TmdbController],
    providers: [TmdbService, ImportProgressService],
    exports: [TmdbService, ImportProgressService], // Экспортируем для использования в других модулях
})
export class TmdbModule {}

