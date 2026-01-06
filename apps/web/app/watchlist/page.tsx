'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { RatingStars } from '@/components/RatingStars'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useWatchlist, useMarkAsWatched, useRemoveFromWatchlist } from '@/lib/api/hooks'

type FilterTab = 'all' | 'planned' | 'watched'

export default function WatchlistPage() {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState<FilterTab>('all')

    const { data: allMovies, isLoading } = useWatchlist(user?.id || '')
    const markAsWatchedMutation = useMarkAsWatched()
    const removeMutation = useRemoveFromWatchlist()

    // Filter movies based on active tab
    const filteredMovies = allMovies?.filter((item) => {
        if (activeTab === 'all') return true
        return item.status === activeTab
    })

    const handleRate = async (movieId: number, rating: number) => {
        if (!user) return

        try {
            await markAsWatchedMutation.mutateAsync({
                user_id: user.id,
                movie_id: movieId,
                rating,
            })
        } catch (error) {
            console.error('Failed to rate movie:', error)
        }
    }

    const handleRemove = async (movieId: number) => {
        if (!user) return

        try {
            await removeMutation.mutateAsync({ movieId, userId: user.id })
        } catch (error) {
            console.error('Failed to remove movie:', error)
        }
    }

    const tabs: { id: FilterTab; label: string; count: number }[] = [
        { id: 'all', label: 'All', count: allMovies?.length || 0 },
        { id: 'planned', label: 'Plan to Watch', count: allMovies?.filter(m => m.status === 'planned').length || 0 },
        { id: 'watched', label: 'Watched', count: allMovies?.filter(m => m.status === 'watched').length || 0 },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f]">
            <Navigation />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">My Watchlist</h1>
                    <p className="text-[#9ca3af]">
                        Manage your movies and rate what you've watched
                    </p>
                </div>

                {/* Tabs */}
                <div className="mb-8 border-b border-white/10">
                    <nav className="flex gap-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-4 border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-[#e50914] text-white font-semibold'
                                        : 'border-transparent text-[#9ca3af] hover:text-white'
                                }`}
                            >
                                {tab.label}
                                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-[#1a1a2e]/40 border border-white/10">
                                      {tab.count}
                                  </span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e50914]"></div>
                    </div>
                ) : filteredMovies && filteredMovies.length > 0 ? (
                    <div className="space-y-4">
                        {filteredMovies.map((item) => {
                            const movie = item.movie
                            if (!movie) return null

                            // Handle both poster_url (full URL) and poster_path (path only)
                            const posterUrl = (movie as any).poster_url
                                || (movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : null)
                                || '/placeholder-movie.jpg'

                            const year = movie.release_date
                                ? new Date(movie.release_date).getFullYear()
                                : 'N/A'

                            return (
                                <div
                                    key={item.id}
                                    className="bg-[#1a1a2e]/40 border border-white/10 rounded-lg hover:border-[#e50914]/30 transition-all backdrop-blur-sm p-4"
                                >
                                    <div className="flex gap-4">
                                        {/* Poster */}
                                        <Link href={`/movies/${movie.id}`} className="flex-shrink-0">
                                            <div className="relative w-24 h-36 rounded overflow-hidden">
                                                <Image
                                                    src={posterUrl}
                                                    alt={movie.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        </Link>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/movies/${movie.id}`}>
                                                <h3 className="text-lg font-semibold text-white hover:text-[#e50914] transition-colors">
                                                    {movie.title}
                                                </h3>
                                            </Link>
                                            <p className="text-sm text-[#9ca3af] mb-2">{year}</p>

                                            {((movie as any).description || movie.overview) && (
                                                <p className="text-sm text-[#9ca3af] line-clamp-2 mb-3">
                                                    {(movie as any).description || movie.overview}
                                                </p>
                                            )}

                                            {/* Status Badge */}
                                            <div className="flex items-center gap-3 mb-3">
                                                  <span
                                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                          item.status === 'watched'
                                                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                      }`}
                                                  >
                                                      {item.status === 'watched' ? '✓ Watched' : '📋 Planned'}
                                                  </span>

                                                {item.status === 'watched' && item.watched_at && (
                                                    <span className="text-xs text-[#9ca3af]">
                                                          {new Date(item.watched_at).toLocaleDateString()}
                                                      </span>
                                                )}
                                            </div>

                                            {/* Rating */}
                                            {item.status === 'watched' && item.rating ? (
                                                <div className="mb-3">
                                                    <p className="text-xs text-[#9ca3af] mb-1">Your rating:</p>
                                                    <RatingStars
                                                        rating={item.rating}
                                                        onRate={(rating) => handleRate(movie.id, rating)}
                                                        size="sm"
                                                    />
                                                </div>
                                            ) : item.status === 'planned' && (
                                                <div className="mb-3">
                                                    <p className="text-xs text-[#9ca3af] mb-1">Rate this movie:</p>
                                                    <RatingStars
                                                        rating={0}
                                                        onRate={(rating) => handleRate(movie.id, rating)}
                                                        size="sm"
                                                    />
                                                    <p className="text-xs text-[#6b7280] mt-1">
                                                        Rating will mark it as watched
                                                    </p>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRemove(movie.id)}
                                                    className="text-sm text-red-400 hover:text-red-300 font-medium"
                                                    disabled={removeMutation.isPending}
                                                >
                                                    {removeMutation.isPending ? 'Removing...' : 'Remove'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">
                            {activeTab === 'watched' ? '🎬' : activeTab === 'planned' ? '📋' : '🍿'}
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            {activeTab === 'watched'
                                ? 'No watched movies yet'
                                : activeTab === 'planned'
                                    ? 'No planned movies'
                                    : 'Your watchlist is empty'}
                        </h3>
                        <p className="text-[#9ca3af] mb-8">
                            {activeTab === 'watched'
                                ? 'Start rating movies you\'ve watched to get personalized recommendations'
                                : activeTab === 'planned'
                                    ? 'Add movies you want to watch to your plan list'
                                    : 'Discover and add movies to start building your watchlist'}
                        </p>
                        <Link
                            href="/discover"
                            className="inline-block px-6 py-3 bg-[#e50914] text-white rounded-lg hover:bg-[#e50914]/90 transition"
                        >
                            Discover Movies
                        </Link>
                    </div>
                )}
            </main>
        </div>
    )
}