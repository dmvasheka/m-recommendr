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
} from './types';