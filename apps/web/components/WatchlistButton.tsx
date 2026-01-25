'use client'

import { useState, useRef, useEffect } from 'react'
import { Bookmark, BookmarkCheck, Check, X } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useWatchlistStatus } from '@/lib/hooks/useWatchlistStatus'
import { useAddToWatchlist, useRemoveFromWatchlist, useMarkAsWatched } from '@/lib/api/hooks'
import { useTranslations } from 'next-intl'
import { showToast } from '@/lib/utils/toast'
import { useRouter } from '@/navigation'

interface WatchlistButtonProps {
    movieId?: number
    contentType?: 'movie' | 'tv_show'
    contentId?: number
    variant?: 'icon' | 'button'
    className?: string
}

export function WatchlistButton({
    movieId,
    contentType = 'movie',
    contentId,
    variant = 'icon',
    className = ''
}: WatchlistButtonProps) {
    const { user } = useAuth()
    const router = useRouter()
    const t = useTranslations('Common.watchlist')
    const itemId = contentId || movieId
    const { status, isInWatchlist } = useWatchlistStatus(itemId, contentType)
    const [showActions, setShowActions] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    const addToWatchlist = useAddToWatchlist()
    const removeFromWatchlist = useRemoveFromWatchlist()
    const markAsWatched = useMarkAsWatched()

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowActions(false)
            }
        }

        if (showActions) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showActions])

    const handleAddToPlanned = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!user || !itemId) {
            if (!user) router.push('/auth/login')
            return
        }

        try {
            await addToWatchlist.mutateAsync({
                user_id: user.id,
                content_type: contentType,
                content_id: itemId,
                movie_id: contentType === 'movie' ? itemId : undefined,
                status: 'planned',
            })
            showToast.success(t('added'))
            setShowActions(false)
        } catch (error) {
            showToast.error(t('error'))
        }
    }

    const handleMarkAsWatched = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!user || !itemId) {
            if (!user) router.push('/auth/login')
            return
        }

        try {
            await markAsWatched.mutateAsync({
                user_id: user.id,
                content_type: contentType,
                content_id: itemId,
                movie_id: contentType === 'movie' ? itemId : undefined,
                rating: 7,
            })
            showToast.success(t('markedWatched'))
            setShowActions(false)
        } catch (error) {
            showToast.error(t('error'))
        }
    }

    const handleRemove = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!user || !itemId) {
            if (!user) router.push('/auth/login')
            return
        }

        try {
            await removeFromWatchlist.mutateAsync({
                itemId,
                userId: user.id,
                content_type: contentType,
            })
            showToast.success(t('removed'))
            setShowActions(false)
        } catch (error) {
            showToast.error(t('error'))
        }
    }

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!isInWatchlist) {
            handleAddToPlanned(e)
        } else {
            setShowActions(!showActions)
        }
    }

    if (variant === 'icon') {
        return (
            <div ref={menuRef} className={`relative ${className}`}>
                <button
                    onClick={handleToggle}
                    className={`p-2 rounded-full backdrop-blur-sm transition-all duration-200 ${
                        isInWatchlist
                            ? 'bg-green-500/90 hover:bg-green-600'
                            : 'bg-black/60 hover:bg-black/80'
                    }`}
                    title={isInWatchlist ? t('in') : t('add')}
                >
                    {status === 'watched' ? (
                        <Check className="w-5 h-5 text-white" />
                    ) : isInWatchlist ? (
                        <BookmarkCheck className="w-5 h-5 text-white" />
                    ) : (
                        <Bookmark className="w-5 h-5 text-white" />
                    )}
                </button>

                {showActions && isInWatchlist && (
                    <div className="absolute top-full right-0 mt-2 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl z-50 min-w-[200px]">
                        <div className="p-2 space-y-1">
                            {status === 'planned' && (
                                <button
                                    onClick={handleMarkAsWatched}
                                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 rounded flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    {t('markAsWatched')}
                                </button>
                            )}
                            <button
                                onClick={handleRemove}
                                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 rounded flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                {t('remove')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <button
            onClick={handleToggle}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                isInWatchlist
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
            } ${className}`}
        >
            {isInWatchlist ? t('in') : t('add')}
        </button>
    )
}
