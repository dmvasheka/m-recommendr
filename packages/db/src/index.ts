// Export Supabase clients
export { supabase, supabaseAnon, testConnection } from './supabase.client';

// Export generated types from Supabase schema
export type { Database as GeneratedDatabase, Json } from './generated-types';

// Export all types (manual types for backwards compatibility and convenience)
export type {
    Database,
    User,
    Movie,
    UserWatchlist,
    UserProfile,
    MovieInsert,
    MovieUpdate,
    TvShow,
    TvShowInsert,
    TvShowUpdate,
    TvSeason,
    TvSeasonInsert,
    TvEpisode,
    TvEpisodeInsert,
    UserTvWatchlist,
    ImportProgress,
    ImportProgressInsert,
    ImportProgressUpdate,
} from './types';