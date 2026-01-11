// Database types for Supabase tables
// Generated based on our migrations

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    email: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            movies: {
                Row: {
                    id: number
                    title: string
                    description: string | null
                    poster_url: string | null
                    backdrop_url: string | null
                    genres: string[] | null
                    release_date: string | null
                    vote_average: number | null
                    vote_count: number | null
                    popularity: number | null
                    runtime: number | null
                    original_language: string | null
                    embedding: number[] | null
                    keywords: string[] | null
                    tagline: string | null
                    movie_cast: Json | null
                    crew: Json | null
                    production_companies: string[] | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: number
                    title: string
                    description?: string | null
                    poster_url?: string | null
                    backdrop_url?: string | null
                    genres?: string[] | null
                    release_date?: string | null
                    vote_average?: number | null
                    vote_count?: number | null
                    popularity?: number | null
                    runtime?: number | null
                    original_language?: string | null
                    embedding?: number[] | null
                    keywords?: string[] | null
                    tagline?: string | null
                    movie_cast?: Json | null
                    crew?: Json | null
                    production_companies?: string[] | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    title?: string
                    description?: string | null
                    poster_url?: string | null
                    backdrop_url?: string | null
                    genres?: string[] | null
                    release_date?: string | null
                    vote_average?: number | null
                    vote_count?: number | null
                    popularity?: number | null
                    runtime?: number | null
                    original_language?: string | null
                    embedding?: number[] | null
                    keywords?: string[] | null
                    tagline?: string | null
                    movie_cast?: Json | null
                    crew?: Json | null
                    production_companies?: string[] | null
                    created_at?: string
                    updated_at?: string
                }
            }
            tv_shows: {
                Row: {
                    id: number
                    name: string
                    overview: string | null
                    poster_url: string | null
                    backdrop_url: string | null
                    genres: string[] | null
                    first_air_date: string | null
                    last_air_date: string | null
                    vote_average: number | null
                    vote_count: number | null
                    popularity: number | null
                    number_of_seasons: number | null
                    number_of_episodes: number | null
                    original_language: string | null
                    origin_country: string[] | null
                    status: string | null
                    keywords: string[] | null
                    tagline: string | null
                    tv_cast: Json | null
                    crew: Json | null
                    production_companies: string[] | null
                    embedding: number[] | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: number
                    name: string
                    overview?: string | null
                    poster_url?: string | null
                    backdrop_url?: string | null
                    genres?: string[] | null
                    first_air_date?: string | null
                    last_air_date?: string | null
                    vote_average?: number | null
                    vote_count?: number | null
                    popularity?: number | null
                    number_of_seasons?: number | null
                    number_of_episodes?: number | null
                    original_language?: string | null
                    origin_country?: string[] | null
                    status?: string | null
                    keywords?: string[] | null
                    tagline?: string | null
                    tv_cast?: Json | null
                    crew?: Json | null
                    production_companies?: string[] | null
                    embedding?: number[] | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    name?: string
                    overview?: string | null
                    poster_url?: string | null
                    backdrop_url?: string | null
                    genres?: string[] | null
                    first_air_date?: string | null
                    last_air_date?: string | null
                    vote_average?: number | null
                    vote_count?: number | null
                    popularity?: number | null
                    number_of_seasons?: number | null
                    number_of_episodes?: number | null
                    original_language?: string | null
                    origin_country?: string[] | null
                    status?: string | null
                    keywords?: string[] | null
                    tagline?: string | null
                    tv_cast?: Json | null
                    crew?: Json | null
                    production_companies?: string[] | null
                    embedding?: number[] | null
                    created_at?: string
                    updated_at?: string
                }
            }
            tv_seasons: {
                Row: {
                    id: number
                    tv_show_id: number
                    season_number: number
                    name: string | null
                    overview: string | null
                    poster_url: string | null
                    air_date: string | null
                    episode_count: number | null
                    vote_average: number | null
                    created_at: string
                }
                Insert: {
                    id: number
                    tv_show_id: number
                    season_number: number
                    name?: string | null
                    overview?: string | null
                    poster_url?: string | null
                    air_date?: string | null
                    episode_count?: number | null
                    vote_average?: number | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    tv_show_id?: number
                    season_number?: number
                    name?: string | null
                    overview?: string | null
                    poster_url?: string | null
                    air_date?: string | null
                    episode_count?: number | null
                    vote_average?: number | null
                    created_at?: string
                }
            }
            tv_episodes: {
                Row: {
                    id: number
                    tv_show_id: number
                    season_id: number
                    episode_number: number
                    name: string | null
                    overview: string | null
                    still_url: string | null
                    air_date: string | null
                    vote_average: number | null
                    vote_count: number | null
                    runtime: number | null
                    created_at: string
                }
                Insert: {
                    id: number
                    tv_show_id: number
                    season_id: number
                    episode_number: number
                    name?: string | null
                    overview?: string | null
                    still_url?: string | null
                    air_date?: string | null
                    vote_average?: number | null
                    vote_count?: number | null
                    runtime?: number | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    tv_show_id?: number
                    season_id?: number
                    episode_number?: number
                    name?: string | null
                    overview?: string | null
                    still_url?: string | null
                    air_date?: string | null
                    vote_average?: number | null
                    vote_count?: number | null
                    runtime?: number | null
                    created_at?: string
                }
            }
            user_watchlist: {
                Row: {
                    user_id: string
                    movie_id: number
                    status: 'planned' | 'watched'
                    rating: number | null
                    watched_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    user_id: string
                    movie_id: number
                    status: 'planned' | 'watched'
                    rating?: number | null
                    watched_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    movie_id?: number
                    status?: 'planned' | 'watched'
                    rating?: number | null
                    watched_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            user_tv_watchlist: {
                Row: {
                    user_id: string
                    tv_show_id: number
                    status: 'planned' | 'watching' | 'watched' | 'dropped'
                    rating: number | null
                    progress_season: number | null
                    progress_episode: number | null
                    watched_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    user_id: string
                    tv_show_id: number
                    status: 'planned' | 'watching' | 'watched' | 'dropped'
                    rating?: number | null
                    progress_season?: number | null
                    progress_episode?: number | null
                    watched_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    tv_show_id?: number
                    status?: 'planned' | 'watching' | 'watched' | 'dropped'
                    rating?: number | null
                    progress_season?: number | null
                    progress_episode?: number | null
                    watched_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            user_profiles: {
                Row: {
                    user_id: string
                    prefs_embedding: number[] | null
                    updated_at: string
                }
                Insert: {
                    user_id: string
                    prefs_embedding?: number[] | null
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    prefs_embedding?: number[] | null
                    updated_at?: string
                }
            }
            chat_messages: {
                Row: {
                    id: string
                    user_id: string
                    user_message: string
                    ai_response: string
                    context_movies: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    user_message: string
                    ai_response: string
                    context_movies?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    user_message?: string
                    ai_response?: string
                    context_movies?: Json | null
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            match_movies: {
                Args: {
                    query_embedding: number[]
                    match_count?: number
                    filter_ids?: number[] | null
                }
                Returns: {
                    id: number
                    title: string
                    description: string | null
                    poster_url: string | null
                    backdrop_url: string | null
                    genres: string[] | null
                    vote_average: number | null
                    popularity: number | null
                    similarity: number
                }[]
            }
            match_tv_shows: {
                Args: {
                    query_embedding: number[]
                    match_count?: number
                    filter_ids?: number[] | null
                }
                Returns: {
                    id: number
                    name: string
                    overview: string | null
                    poster_url: string | null
                    backdrop_url: string | null
                    vote_average: number | null
                    popularity: number | null
                    similarity: number
                }[]
            }
            match_movies_by_profile: {
                Args: {
                    p_user_id: string
                    match_count?: number
                }
                Returns: {
                    id: number
                    title: string
                    description: string | null
                    poster_url: string | null
                    backdrop_url: string | null
                    genres: string[] | null
                    vote_average: number | null
                    popularity: number | null
                    similarity: number
                }[]
            }
            get_similar_movies: {
                Args: {
                    p_movie_id: number
                    match_count?: number
                }
                Returns: {
                    id: number
                    title: string
                    description: string | null
                    poster_url: string | null
                    backdrop_url: string | null
                    genres: string[] | null
                    vote_average: number | null
                    popularity: number | null
                    similarity: number
                }[]
            }
            update_user_profile_embedding: {
                Args: {
                    p_user_id: string
                    min_rating?: number
                }
                Returns: void
            }
        }
        Enums: {
            [_ in never]: never
        }
    }
}

// Helper types for easier usage
export type User = Database['public']['Tables']['users']['Row']
export type Movie = Database['public']['Tables']['movies']['Row']
export type TvShow = Database['public']['Tables']['tv_shows']['Row']
export type TvSeason = Database['public']['Tables']['tv_seasons']['Row']
export type TvEpisode = Database['public']['Tables']['tv_episodes']['Row']
export type UserWatchlist = Database['public']['Tables']['user_watchlist']['Row']
export type UserTvWatchlist = Database['public']['Tables']['user_tv_watchlist']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']

export type MovieInsert = Database['public']['Tables']['movies']['Insert']
export type MovieUpdate = Database['public']['Tables']['movies']['Update']
export type TvShowInsert = Database['public']['Tables']['tv_shows']['Insert']
export type TvShowUpdate = Database['public']['Tables']['tv_shows']['Update']
export type TvSeasonInsert = Database['public']['Tables']['tv_seasons']['Insert']
export type TvEpisodeInsert = Database['public']['Tables']['tv_episodes']['Insert']