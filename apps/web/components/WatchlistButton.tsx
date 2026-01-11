'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useAddToWatchlist, useRemoveFromWatchlist, useWatchlist } from '@/lib/api/hooks'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/navigation'

interface WatchlistButtonProps {
    movieId: number
    variant?: 'icon' | 'button'
}

export function WatchlistButton({ movieId, variant = 'button' }: WatchlistButtonProps) {
    const { user } = useAuth()
    const [isAdding, setIsAdding] = useState(false)
    const router = useRouter()
    const t = useTranslations('Common.watchlist')
    const tCommon = useTranslations('Common')

    const { data: watchlist } = useWatchlist(user?.id || '')
    const addMutation = useAddToWatchlist()
    const removeMutation = useRemoveFromWatchlist()

    const isInWatchlist = watchlist?.some(item => item.movie_id === movieId)

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!user) {
            // Use localized router instead of window.location
            router.push('/auth/login')
            return
        }

        setIsAdding(true)

        try {
            if (isInWatchlist) {
                await removeMutation.mutateAsync({ movieId, userId: user.id })
            } else {
                await addMutation.mutateAsync({
                    user_id: user.id,
                    movie_id: movieId,
                    status: 'planned',
                })
            }
        } catch (error) {
            console.error('Failed to update watchlist:', error)
        } finally {
            setIsAdding(false)
        }
    }

    if (variant === 'icon') {
        return (
            <button
                onClick={handleToggle}
                disabled={isAdding}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                title={isInWatchlist ? t('remove') : t('add')}
            >
                <svg
                    className={`w-6 h-6 ${isInWatchlist ? 'fill-indigo-600' : 'fill-none'} stroke-current`}
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                </svg>
            </button>
        )
    }

    return (
        <button
            onClick={handleToggle}
            disabled={isAdding}
            className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                isInWatchlist
                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
        >
            {isAdding ? tCommon('loading') : isInWatchlist ? t('in') : t('add')}
        </button>
    )
}
