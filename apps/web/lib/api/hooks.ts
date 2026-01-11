import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type {
    AddToWatchlistParams,
    MarkAsWatchedParams,
    SearchMoviesParams,
    SimilarMoviesParams,
    SendChatMessageParams,
} from './types'

// Movies
export function useMovies(page = 1, pageSize = 20) {
    return useQuery({
        queryKey: ['movies', page, pageSize],
        queryFn: () => api.getMovies(page, pageSize),
    })
}

export function useMovie(id: number) {
    return useQuery({
        queryKey: ['movie', id],
        queryFn: () => api.getMovie(id),
        enabled: !!id,
    })
}

export function useAutocomplete(query: string, limit = 5) {
    return useQuery({
        queryKey: ['autocomplete', query, limit],
        queryFn: () => api.autocompleteMovies(query, limit),
        enabled: query.length >= 2,
        staleTime: 60 * 1000, // Cache for 1 minute
    })
}

export function useSearchMovies(params: SearchMoviesParams) {
    return useQuery({
        queryKey: ['movies', 'search', params.query, params.limit],
        queryFn: () => api.searchMovies(params),
        enabled: params.query.length > 0,
    })
}

export function useSimilarMovies(params: SimilarMoviesParams) {
    return useQuery({
        queryKey: ['movies', 'similar', params.movieId, params.limit],
        queryFn: () => api.getSimilarMovies(params),
        enabled: !!params.movieId,
    })
}


// Watchlist
export function useWatchlist(userId: string, status?: 'planned' | 'watched') {
    return useQuery({
        queryKey: ['watchlist', userId, status],
        queryFn: () => api.getWatchlist(userId, status),
        enabled: !!userId,
    })
}

export function useAddToWatchlist() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (params: AddToWatchlistParams) => api.addToWatchlist(params),
        onSuccess: (_, variables) => {
            // Invalidate watchlist and recommendations
            queryClient.invalidateQueries({ queryKey: ['watchlist', variables.user_id] })
            queryClient.invalidateQueries({ queryKey: ['recommendations', variables.user_id] })
        },
    })
}

export function useMarkAsWatched() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (params: MarkAsWatchedParams) => api.markAsWatched(params),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['watchlist', variables.user_id] })
            queryClient.invalidateQueries({ queryKey: ['recommendations', variables.user_id] })
        },
    })
}

export function useRemoveFromWatchlist() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ movieId, userId }: { movieId: number; userId: string }) =>
            api.removeFromWatchlist(movieId, userId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['watchlist', variables.userId] })
            queryClient.invalidateQueries({ queryKey: ['recommendations', variables.userId] })
        },
    })
}

// Recommendations
export function useRecommendations(userId: string, limit = 10) {
    return useQuery({
        queryKey: ['recommendations', userId, limit],
        queryFn: () => api.getRecommendations(userId, limit),
        enabled: !!userId,
    })
}

export function useHybridRecommendations(userId: string, limit = 10) {
    return useQuery({
        queryKey: ['recommendations', 'hybrid', userId, limit],
        queryFn: () => api.getHybridRecommendations(userId, limit),
        enabled: !!userId,
    })
}

export function usePopularMovies(limit = 10) {
    return useQuery({
        queryKey: ['movies', 'popular', limit],
        queryFn: () => api.getPopularMovies(limit),
    })
}

// Chat
export function useChatHistory(userId: string, limit = 20) {
    return useQuery({
        queryKey: ['chat', 'history', userId, limit],
        queryFn: () => api.getChatHistory(userId, limit),
        enabled: !!userId,
    })
}

export function useSendChatMessage() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (params: SendChatMessageParams) => api.sendChatMessage(params),
        onSuccess: (_, variables) => {
            // Invalidate chat history to refetch
            queryClient.invalidateQueries({ queryKey: ['chat', 'history', variables.userId] })
        },
    })
}

export function useClearChatHistory() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (userId: string) => api.clearChatHistory(userId),
        onSuccess: (_, userId) => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'history', userId] })
        },
    })
}