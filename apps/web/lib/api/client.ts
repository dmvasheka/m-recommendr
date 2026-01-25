import type {
    Movie,
    WatchlistItem,
    AddToWatchlistParams,
    MarkAsWatchedParams,
    Recommendation,
    SearchMoviesParams,
    SimilarMoviesParams,
    ChatMessage,
    SendChatMessageParams,
    ChatHistoryMessage,
    TvShow,
    TvSeason,
    SearchTvShowsParams,
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

class ApiClient {
    private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            ...options,
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(error || 'API request failed')
        }

        return response.json()
    }

    // Movies
    async getMovies(page = 1, pageSize = 20): Promise<Movie[]> {
        const response = await this.fetch<{ success: boolean; movies: Movie[] }>(
            `/api/movies?page=${page}&pageSize=${pageSize}`
        )
        return response.movies || []
    }

    async getMovie(id: number, language?: string): Promise<Movie> {
        const langParam = language ? `?language=${language}` : ''
        const data = await this.fetch<{ success: boolean; movie: Movie }>(`/api/movies/${id}${langParam}`)
        return data.movie
    }

    async autocompleteMovies(query: string, limit = 5, language?: string): Promise<Movie[]> {
        const langParam = language ? `&language=${language}` : ''
        const data = await this.fetch<{ success: boolean; results: Movie[] }>(
            `/api/movies/autocomplete?q=${encodeURIComponent(query)}&limit=${limit}${langParam}`
        )
        return data.results
    }

    async searchMovies({ query, limit = 10, language }: SearchMoviesParams): Promise<Movie[]> {
        const langParam = language ? `&language=${language}` : ''
        const response = await this.fetch<{ success: boolean; results: Movie[] }>(
            `/api/movies/search?q=${encodeURIComponent(query)}&limit=${limit}${langParam}`
        )
        return response.results || []
    }

    async getSimilarMovies({ movieId, limit = 10, language }: SimilarMoviesParams): Promise<Movie[]> {
        const langParam = language ? `&language=${language}` : ''
        const response = await this.fetch<{ success: boolean; results: Movie[] }>(
            `/api/movies/${movieId}/similar?limit=${limit}${langParam}`
        )
        return response.results || []
    }


    // Watchlist
    async getWatchlist(userId: string, status?: 'planned' | 'watched', language?: string): Promise<WatchlistItem[]> {
        const statusParam = status ? `&status=${status}` : ''
        const langParam = language ? `&language=${language}` : ''
        const response = await this.fetch<{ success: boolean; items: WatchlistItem[] }>(
            `/api/watchlist?user_id=${userId}${statusParam}${langParam}`
        )
        return response.items || []
    }

    async addToWatchlist(params: AddToWatchlistParams): Promise<WatchlistItem> {
        const response = await this.fetch<{ success: boolean; item: WatchlistItem }>('/api/watchlist/add', {
            method: 'POST',
            body: JSON.stringify(params),
        })
        return response.item
    }

    async markAsWatched(params: MarkAsWatchedParams): Promise<WatchlistItem> {
        const response = await this.fetch<{ success: boolean; item: WatchlistItem }>('/api/watchlist/watched', {
            method: 'POST',
            body: JSON.stringify(params),
        })
        return response.item
    }

    async removeFromWatchlist(itemId: number, userId: string, content_type?: 'movie' | 'tv_show'): Promise<void> {
        const contentTypeParam = content_type ? `&content_type=${content_type}` : ''
        return this.fetch(`/api/watchlist/${itemId}?user_id=${userId}${contentTypeParam}`, {
            method: 'DELETE',
        })
    }

    // Recommendations
    async getRecommendations(userId: string, limit = 10, language?: string): Promise<Recommendation[]> {
        const langParam = language ? `&language=${language}` : ''
        const response = await this.fetch<{ success: boolean; recommendations: Recommendation[] }>(
            `/api/recommendations?user_id=${userId}&limit=${limit}${langParam}`
        )
        return response.recommendations || []
    }

    async getHybridRecommendations(userId: string, limit = 10, language?: string): Promise<Recommendation[]> {
        const langParam = language ? `&language=${language}` : ''
        const response = await this.fetch<{ success: boolean; recommendations: Recommendation[] }>(
            `/api/recommendations/hybrid?user_id=${userId}&limit=${limit}${langParam}`
        )
        return response.recommendations || []
    }

    async getPopularMovies(limit = 10, language?: string): Promise<Movie[]> {
        const langParam = language ? `&language=${language}` : ''
        const response = await this.fetch<{ success: boolean; recommendations: Movie[] }>(
            `/api/recommendations/popular?limit=${limit}${langParam}`
        )
        return response.recommendations || []
    }

    // TMDB
    async searchTMDB(query: string): Promise<any[]> {
        return this.fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`)
    }

    async importMovieFromTMDB(tmdbId: number): Promise<Movie> {
        return this.fetch(`/api/tmdb/import/${tmdbId}`, {
            method: 'POST',
        })
    }

    // Chat
    async sendChatMessage(params: SendChatMessageParams): Promise<ChatMessage> {
        const response = await this.fetch<{
            success: boolean
            userMessage: string
            aiResponse: string
            contextMovies: number[]
            timestamp: string
        }>('/api/chat', {
            method: 'POST',
            body: JSON.stringify(params),
        })
        return {
            userMessage: response.userMessage,
            aiResponse: response.aiResponse,
            contextMovies: response.contextMovies,
            timestamp: response.timestamp,
        }
    }

    async getChatHistory(userId: string, limit = 20): Promise<ChatHistoryMessage[]> {
        const response = await this.fetch<{
            success: boolean
            history: ChatHistoryMessage[]
            count: number
        }>(`/api/chat/history/${userId}?limit=${limit}`)
        return response.history || []
    }

    async clearChatHistory(userId: string): Promise<void> {
        return this.fetch(`/api/chat/clear/${userId}`, {
            method: 'DELETE',
        })
    }

    // User preferences - Language
    async updateLanguagePreference(userId: string, language: string): Promise<void> {
        return this.fetch(`/api/users/${userId}/language`, {
            method: 'PATCH',
            body: JSON.stringify({ language }),
        })
    }

    async getLanguagePreference(userId: string): Promise<string> {
        const response = await this.fetch<{ success: boolean; language: string }>(
            `/api/users/${userId}/language`
        )
        return response.language || 'en'
    }

    // TV Shows
    async getTvShows(page = 1, pageSize = 20, language?: string): Promise<TvShow[]> {
        const langParam = language ? `&language=${language}` : ''
        const response = await this.fetch<{
            success: boolean
            tvShows: TvShow[]
            total: number
        }>(`/api/tv-shows?page=${page}&pageSize=${pageSize}${langParam}`)
        return response.tvShows || []
    }

    async getTvShowById(id: number, language?: string): Promise<TvShow | null> {
        const langParam = language ? `?language=${language}` : ''
        const response = await this.fetch<{ success: boolean; tvShow: TvShow }>(
            `/api/tv-shows/${id}${langParam}`
        )
        return response.tvShow || null
    }

    async searchTvShows(params: SearchTvShowsParams): Promise<TvShow[]> {
        const { query, limit = 20, language } = params
        const langParam = language ? `&language=${language}` : ''
        const response = await this.fetch<{ success: boolean; results: TvShow[] }>(
            `/api/tv-shows/search?q=${encodeURIComponent(query)}&limit=${limit}${langParam}`
        )
        return response.results || []
    }

    async autocompleteTvShows(query: string, limit = 10, language?: string): Promise<TvShow[]> {
        const langParam = language ? `&language=${language}` : ''
        const response = await this.fetch<{ success: boolean; results: TvShow[] }>(
            `/api/tv-shows/autocomplete?q=${encodeURIComponent(query)}&limit=${limit}${langParam}`
        )
        return response.results || []
    }

    async getTvShowSeasons(tvShowId: number): Promise<TvSeason[]> {
        const response = await this.fetch<{ success: boolean; seasons: TvSeason[] }>(
            `/api/tv-shows/${tvShowId}/seasons`
        )
        return response.seasons || []
    }
}

export const api = new ApiClient()
