// Movie types
export interface Movie {
    id: number
    tmdb_id?: number
    title: string
    overview?: string | null
    description?: string | null // API returns 'description' instead of 'overview'
    poster_path?: string | null
    poster_url?: string | null // API returns full URL
    backdrop_path?: string | null
    backdrop_url?: string | null // API returns full URL
    release_date: string | null
    vote_average: number | null
    vote_count?: number | null
    popularity?: number | null
    genres: string[] | null
    runtime?: number | null
    original_language?: string | null
    embedding?: number[] | null
    created_at?: string
    updated_at?: string
    similarity?: number // For recommendation responses
}

// Watchlist types
export interface WatchlistItem {
    id: string
    user_id: string
    movie_id: number
    status: 'planned' | 'watched'
    rating: number | null
    watched_at: string | null
    created_at: string
    updated_at: string
    movie?: Movie
}

export interface AddToWatchlistParams {
    user_id: string
    movie_id: number
    status: 'planned' | 'watched'
}

export interface MarkAsWatchedParams {
    user_id: string
    movie_id: number
    rating: number // 1-10
}

// Recommendations types
export interface Recommendation {
    movie: Movie
    similarity_score?: number
    popularity_score?: number
    hybrid_score?: number
}

// Search types
export interface SearchMoviesParams {
    query: string
    limit?: number
    language?: string
}

export interface SimilarMoviesParams {
    movieId: number
    limit?: number
    language?: string
}

// Chat types
export interface ChatMessage {
    userMessage: string
    aiResponse: string
    contextMovies: number[]
    timestamp: string
}

export interface SendChatMessageParams {
    userId: string
    message: string
    includeHistory?: boolean
    language?: string
}

export interface ChatHistoryMessage {
    role: 'user' | 'assistant'
    content: string
}

// TV Show types
export interface TvShow {
    id: number
    name: string
    overview?: string | null
    poster_path?: string | null
    poster_url?: string | null
    backdrop_path?: string | null
    backdrop_url?: string | null
    first_air_date: string | null
    vote_average: number | null
    vote_count?: number | null
    popularity?: number | null
    genres?: string[] | null
    number_of_seasons?: number | null
    number_of_episodes?: number | null
    status?: string | null
    original_language?: string | null
    similarity?: number
}

export interface SearchTvShowsParams {
    query: string
    limit?: number
    language?: string
}

// TV Season types
export interface TvSeason {
    id: number
    tv_show_id: number
    season_number: number
    name: string | null
    overview: string | null
    poster_url: string | null
    air_date: string | null
    episode_count: number | null
    vote_average: number | null
}