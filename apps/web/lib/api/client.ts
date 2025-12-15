import type {
    Movie,
    WatchlistItem,
    AddToWatchlistParams,
    MarkAsWatchedParams,
    Recommendation,
    SearchMoviesParams,
    SimilarMoviesParams,
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
        return this.fetch(`/movies?page=${page}&pageSize=${pageSize}`)
    }

    async getMovieById(id: number): Promise<Movie> {
        return this.fetch(`/movies/${id}`)
    }

    async searchMovies({ query, limit = 10 }: SearchMoviesParams): Promise<Movie[]> {
        return this.fetch(`/movies/search?q=${encodeURIComponent(query)}&limit=${limit}`)
    }

    async getSimilarMovies({ movieId, limit = 10 }: SimilarMoviesParams): Promise<Movie[]> {
        return this.fetch(`/movies/${movieId}/similar?limit=${limit}`)
    }

    // Watchlist
    async getWatchlist(userId: string, status?: 'planned' | 'watched'): Promise<WatchlistItem[]> {
        const statusParam = status ? `&status=${status}` : ''
        return this.fetch(`/watchlist?user_id=${userId}${statusParam}`)
    }

    async addToWatchlist(params: AddToWatchlistParams): Promise<WatchlistItem> {
        return this.fetch('/watchlist/add', {
            method: 'POST',
            body: JSON.stringify(params),
        })
    }

    async markAsWatched(params: MarkAsWatchedParams): Promise<WatchlistItem> {
        return this.fetch('/watchlist/watched', {
            method: 'POST',
            body: JSON.stringify(params),
        })
    }

    async removeFromWatchlist(movieId: number, userId: string): Promise<void> {
        return this.fetch(`/watchlist/${movieId}?user_id=${userId}`, {
            method: 'DELETE',
        })
    }

    // Recommendations
    async getRecommendations(userId: string, limit = 10): Promise<Recommendation[]> {
        return this.fetch(`/recommendations?user_id=${userId}&limit=${limit}`)
    }

    async getHybridRecommendations(userId: string, limit = 10): Promise<Recommendation[]> {
        return this.fetch(`/recommendations/hybrid?user_id=${userId}&limit=${limit}`)
    }

    async getPopularMovies(limit = 10): Promise<Movie[]> {
        return this.fetch(`/recommendations/popular?limit=${limit}`)
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
}

export const api = new ApiClient()