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

export function useMovie(id: number, language?: string) {
    return useQuery({
        queryKey: ['movie', id, language],
        queryFn: () => api.getMovie(id, language),
        enabled: !!id,
    })
}

export function useAutocomplete(query: string, limit = 5, language?: string) {
    return useQuery({
        queryKey: ['autocomplete', query, limit, language],
        queryFn: () => api.autocompleteMovies(query, limit, language),
        enabled: query.length >= 2,
        staleTime: 60 * 1000, // Cache for 1 minute
    })
}

export function useSearchMovies(params: SearchMoviesParams) {
    return useQuery({
        queryKey: ['movies', 'search', params.query, params.limit, params.language],
        queryFn: () => api.searchMovies(params),
        enabled: params.query.length > 0,
    })
}

export function useSimilarMovies(params: SimilarMoviesParams) {
    return useQuery({
        queryKey: ['movies', 'similar', params.movieId, params.limit, params.language],
        queryFn: () => api.getSimilarMovies(params),
        enabled: !!params.movieId,
    })
}


// Watchlist
export function useWatchlist(userId: string, status?: 'planned' | 'watched', language?: string) {
    return useQuery({
        queryKey: ['watchlist', userId, status, language],
        queryFn: () => api.getWatchlist(userId, status, language),
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
export function useRecommendations(userId: string, limit = 10, language?: string) {
    return useQuery({
        queryKey: ['recommendations', userId, limit, language],
        queryFn: () => api.getRecommendations(userId, limit, language),
        enabled: !!userId,
    })
}

export function useHybridRecommendations(userId: string, limit = 10, language?: string) {
    return useQuery({
        queryKey: ['recommendations', 'hybrid', userId, limit, language],
        queryFn: () => api.getHybridRecommendations(userId, limit, language),
        enabled: !!userId,
    })
}

export function usePopularMovies(limit = 10, language?: string) {
    return useQuery({
        queryKey: ['movies', 'popular', limit, language],
        queryFn: () => api.getPopularMovies(limit, language),
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

// User Preferences - Language
export function useLanguagePreference(userId: string) {
    return useQuery({
        queryKey: ['user', 'language', userId],
        queryFn: () => api.getLanguagePreference(userId),
        enabled: !!userId,
        staleTime: Infinity, // Don't refetch unless explicitly invalidated
    })
}

export function useUpdateLanguagePreference() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ userId, language }: { userId: string; language: string }) =>
            api.updateLanguagePreference(userId, language),
        onSuccess: (_, variables) => {
            // Invalidate language preference to refetch
            queryClient.invalidateQueries({ queryKey: ['user', 'language', variables.userId] })
        },
    })
}

// TV Shows
export function useTvShows(page = 1, pageSize = 20, language?: string) {
    return useQuery({
        queryKey: ['tv-shows', page, pageSize, language],
        queryFn: () => api.getTvShows(page, pageSize, language),
        staleTime: 5 * 60 * 1000,
    })
}

export function useTvShow(id: number, language?: string) {
    return useQuery({
        queryKey: ['tv-show', id, language],
        queryFn: () => api.getTvShowById(id, language),
        enabled: !!id,
        staleTime: 10 * 60 * 1000,
    })
}

export function useSearchTvShows(params: { query: string; limit?: number; language?: string }) {
    return useQuery({
        queryKey: ['tv-shows', 'search', params.query, params.limit, params.language],
        queryFn: () => api.searchTvShows(params),
        enabled: params.query.length >= 2,
        staleTime: 5 * 60 * 1000,
    })
}

export function useAutocompleteTvShows(query: string, limit = 10, language?: string) {
    return useQuery({
        queryKey: ['tv-shows', 'autocomplete', query, limit, language],
        queryFn: () => api.autocompleteTvShows(query, limit, language),
        enabled: query.length >= 2,
        staleTime: 60 * 1000,
    })
}

export function useTvShowSeasons(tvShowId: number) {
    return useQuery({
        queryKey: ['tv-show', tvShowId, 'seasons'],
        queryFn: () => api.getTvShowSeasons(tvShowId),
        enabled: !!tvShowId,
        staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    })
}