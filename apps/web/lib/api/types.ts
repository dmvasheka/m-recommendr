// Movie types
export interface Movie {
    id: number
    tmdb_id: number
    title: string
    overview: string | null
    poster_path: string | null
    backdrop_path: string | null
    release_date: string | null
    vote_average: number | null
    vote_count: number | null
    popularity: number | null
    genres: string[] | null
    runtime: number | null
    original_language: string | null
    embedding: number[] | null
    created_at: string
    updated_at: string
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
}

export interface SimilarMoviesParams {
    movieId: number
    limit?: number
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
}

export interface ChatHistoryMessage {
    role: 'user' | 'assistant'
    content: string
}