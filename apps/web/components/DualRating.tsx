'use client'

import Image from 'next/image'

interface DualRatingProps {
    tmdbRating?: number | null
    tmdbVotes?: number | null
    imdbRating?: number | null
    imdbVotes?: number | null
    imdbId?: string | null
    size?: 'sm' | 'md' | 'lg'
    showVotes?: boolean
    className?: string
}

export function DualRating({
    tmdbRating,
    tmdbVotes,
    imdbRating,
    imdbVotes,
    imdbId,
    size = 'md',
    showVotes = false,
    className = '',
}: DualRatingProps) {
    const sizeClasses = {
        sm: {
            container: 'gap-2',
            logo: 'w-6 h-3',
            imdbLogo: 'w-8 h-4',
            rating: 'text-sm',
            votes: 'text-[10px]',
        },
        md: {
            container: 'gap-3',
            logo: 'w-8 h-4',
            imdbLogo: 'w-10 h-5',
            rating: 'text-base',
            votes: 'text-xs',
        },
        lg: {
            container: 'gap-4',
            logo: 'w-10 h-5',
            imdbLogo: 'w-12 h-6',
            rating: 'text-lg',
            votes: 'text-sm',
        },
    }

    const styles = sizeClasses[size]

    const formatVotes = (votes: number): string => {
        if (votes >= 1000000) {
            return `${(votes / 1000000).toFixed(1)}M`
        }
        if (votes >= 1000) {
            return `${(votes / 1000).toFixed(1)}K`
        }
        return votes.toString()
    }

    const hasTmdb = tmdbRating !== null && tmdbRating !== undefined
    const hasImdb = imdbRating !== null && imdbRating !== undefined

    if (!hasTmdb && !hasImdb) {
        return null
    }

    return (
        <div className={`flex items-center ${styles.container} ${className}`}>
            {/* TMDB Rating */}
            {hasTmdb && (
                <div className="flex items-center gap-1.5">
                    <span className="text-[#01d277] font-bold" title="TMDB">
                        ⭐
                    </span>
                    <span className={`font-semibold text-white ${styles.rating}`}>
                        {tmdbRating.toFixed(1)}
                    </span>
                    {showVotes && tmdbVotes && (
                        <span className={`text-[#9ca3af] ${styles.votes}`}>
                            ({formatVotes(tmdbVotes)})
                        </span>
                    )}
                </div>
            )}

            {/* IMDb Rating */}
            {hasImdb && (
                <a
                    href={imdbId ? `https://www.imdb.com/title/${imdbId}/` : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1.5 ${imdbId ? 'hover:opacity-80 transition-opacity' : ''}`}
                    title="IMDb Rating"
                >
                    <span className="bg-[#f5c518] text-black font-bold px-1 py-0.5 rounded text-[10px] leading-none">
                        IMDb
                    </span>
                    <span className={`font-semibold text-white ${styles.rating}`}>
                        {imdbRating.toFixed(1)}
                    </span>
                    {showVotes && imdbVotes && (
                        <span className={`text-[#9ca3af] ${styles.votes}`}>
                            ({formatVotes(imdbVotes)})
                        </span>
                    )}
                </a>
            )}
        </div>
    )
}

interface CompactRatingBadgeProps {
    tmdbRating?: number | null
    imdbRating?: number | null
    imdbId?: string | null
}

export function CompactRatingBadge({
    tmdbRating,
    imdbRating,
    imdbId,
}: CompactRatingBadgeProps) {
    const hasTmdb = tmdbRating !== null && tmdbRating !== undefined
    const hasImdb = imdbRating !== null && imdbRating !== undefined

    if (!hasTmdb && !hasImdb) {
        return null
    }

    return (
        <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-md">
            {hasTmdb && (
                <span className="text-sm font-semibold text-white" title="TMDB">
                    ⭐ {tmdbRating.toFixed(1)}
                </span>
            )}
            {hasTmdb && hasImdb && (
                <span className="text-[#9ca3af] text-xs">|</span>
            )}
            {hasImdb && (
                <span className="text-sm font-semibold text-[#f5c518]" title="IMDb">
                    {imdbRating.toFixed(1)}
                </span>
            )}
        </div>
    )
}
