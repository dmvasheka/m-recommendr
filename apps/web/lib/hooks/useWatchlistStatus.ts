import { useWatchlist } from '../api/hooks'
import { useAuth } from '../auth/AuthProvider'

export function useWatchlistStatus(itemId?: number, contentType: 'movie' | 'tv_show' = 'movie') {
    const { user } = useAuth()
    const { data: watchlist, isLoading } = useWatchlist(user?.id || '', undefined, undefined)

    if (!user || isLoading || !itemId) {
        return {
            status: null,
            isLoading,
            isInWatchlist: false,
        }
    }

    // Find item by content_id and content_type, or fallback to movie_id for backward compatibility
    const item = watchlist?.find((w) => {
        if (w.content_id && w.content_type) {
            return w.content_id === itemId && w.content_type === contentType
        }
        // Fallback to old movie_id format
        return w.movie_id === itemId && contentType === 'movie'
    })

    return {
        status: item?.status || null,
        isLoading,
        isInWatchlist: !!item,
        watchlistItem: item,
    }
}
