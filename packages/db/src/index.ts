// Export Supabase clients
export { supabase, supabaseAnon, testConnection } from './supabase.client';

// Export all types
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
} from './types';