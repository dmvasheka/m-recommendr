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
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

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
            `/movies?page=${page}&pageSize=${pageSize}`
        )
        return response.movies || []
    }

    async getMovieById(id: number): Promise<Movie> {
        const response = await this.fetch<{ success: boolean; movie: Movie }>(
            `/movies/${id}`
        )
        return response.movie
    }

    async searchMovies({ query, limit = 10 }: SearchMoviesParams): Promise<Movie[]> {
        const response = await this.fetch<{ success: boolean; results: Movie[] }>(
            `/movies/search?q=${encodeURIComponent(query)}&limit=${limit}`
        )
        return response.results || []
    }

    async getSimilarMovies({ movieId, limit = 10 }: SimilarMoviesParams): Promise<Movie[]> {
        const response = await this.fetch<{ success: boolean; results: Movie[] }>(
            `/movies/${movieId}/similar?limit=${limit}`
        )
        return response.results || []
    }

    // Watchlist
    async getWatchlist(userId: string, status?: 'planned' | 'watched'): Promise<WatchlistItem[]> {
        const statusParam = status ? `&status=${status}` : ''
        const response = await this.fetch<{ success: boolean; items: WatchlistItem[] }>(
            `/watchlist?user_id=${userId}${statusParam}`
        )
        return response.items || []
    }

    async addToWatchlist(params: AddToWatchlistParams): Promise<WatchlistItem> {
        const response = await this.fetch<{ success: boolean; item: WatchlistItem }>('/watchlist/add', {
            method: 'POST',
            body: JSON.stringify(params),
        })
        return response.item
    }

    async markAsWatched(params: MarkAsWatchedParams): Promise<WatchlistItem> {
        const response = await this.fetch<{ success: boolean; item: WatchlistItem }>('/watchlist/watched', {
            method: 'POST',
            body: JSON.stringify(params),
        })
        return response.item
    }

    async removeFromWatchlist(movieId: number, userId: string): Promise<void> {
        return this.fetch(`/watchlist/${movieId}?user_id=${userId}`, {
            method: 'DELETE',
        })
    }

    // Recommendations
    async getRecommendations(userId: string, limit = 10): Promise<Recommendation[]> {
        const response = await this.fetch<{ success: boolean; recommendations: Recommendation[] }>(
            `/recommendations?user_id=${userId}&limit=${limit}`
        )
        return response.recommendations || []
    }

    async getHybridRecommendations(userId: string, limit = 10): Promise<Recommendation[]> {
        const response = await this.fetch<{ success: boolean; recommendations: Recommendation[] }>(
            `/recommendations/hybrid?user_id=${userId}&limit=${limit}`
        )
        return response.recommendations || []
    }

    async getPopularMovies(limit = 10): Promise<Movie[]> {
        const response = await this.fetch<{ success: boolean; recommendations: Movie[] }>(
            `/recommendations/popular?limit=${limit}`
        )
        return response.recommendations || []
    }

    // TMDB
    async searchTMDB(query: string): Promise<any[]> {
        return this.fetch(`/tmdb/search?q=${encodeURIComponent(query)}`)
    }

    async importMovieFromTMDB(tmdbId: number): Promise<Movie> {
        return this.fetch(`/tmdb/import/${tmdbId}`, {
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
        }>('/chat', {
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
        }>(`/chat/history/${userId}?limit=${limit}`)
        return response.history || []
    }

    async clearChatHistory(userId: string): Promise<void> {
        return this.fetch(`/chat/clear/${userId}`, {
            method: 'DELETE',
        })
    }
}

export const api = new ApiClient()