'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { MovieCard } from '@/components/MovieCard'
import { useAuth } from '@/lib/auth/AuthProvider'
import {
    useRecommendations,
    useHybridRecommendations,
    usePopularMovies,
    useWatchlist,
} from '@/lib/api/hooks'

type RecommendationType = 'personalized' | 'hybrid' | 'popular'

export default function RecommendationsPage() {
    const { user } = useAuth()
    const [recType, setRecType] = useState<RecommendationType>('hybrid')

    // Fetch different recommendation types
    const { data: personalizedRecs, isLoading: isPersonalizedLoading } = useRecommendations(
        user?.id || '',
        20
    )
    const { data: hybridRecs, isLoading: isHybridLoading } = useHybridRecommendations(
        user?.id || '',
        20
    )
    const { data: popularMovies, isLoading: isPopularLoading } = usePopularMovies(20)

    // Get watchlist to show stats
    const { data: watchlist } = useWatchlist(user?.id || '')

    const watchedCount = watchlist?.filter((item) => item.status === 'watched').length || 0
    const ratedCount = watchlist?.filter((item) => item.rating && item.rating >= 7).length || 0

    // Determine which recommendations to show
    const hasProfile = ratedCount > 0
    const showPersonalized = recType === 'personalized' && hasProfile
    const showHybrid = recType === 'hybrid' && hasProfile
    const showPopular = recType === 'popular' || !hasProfile

    const currentRecs = showPersonalized
        ? personalizedRecs
        : showHybrid
            ? hybridRecs
            : popularMovies

    const isLoading = showPersonalized
        ? isPersonalizedLoading
        : showHybrid
            ? isHybridLoading
            : isPopularLoading

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">For You</h1>
                    <p className="text-gray-600">
                        AI-powered recommendations based on your taste
                    </p>
                </div>

                {/* Stats Card */}
                <div className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold mb-2">Your Profile</h2>
                            <div className="flex gap-6 text-sm">
                                <div>
                                    <span className="opacity-90">Watched:</span>{' '}
                                    <strong>{watchedCount}</strong> movies
                                </div>
                                <div>
                                    <span className="opacity-90">Highly rated (≥7):</span>{' '}
                                    <strong>{ratedCount}</strong> movies
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            {hasProfile ? (
                                <div>
                                    <div className="text-3xl mb-1">✨</div>
                                    <div className="text-sm opacity-90">Profile Active</div>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-3xl mb-1">🌱</div>
                                    <div className="text-sm opacity-90">Getting Started</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {!hasProfile && (
                        <div className="mt-4 pt-4 border-t border-white/20">
                            <p className="text-sm opacity-90">
                                💡 Rate at least one movie with 7+ stars to unlock personalized recommendations!
                            </p>
                        </div>
                    )}
                </div>

                {/* Recommendation Type Selector */}
                {hasProfile && (
                    <div className="mb-8">
                        <div className="flex gap-4 flex-wrap">
                            <button
                                onClick={() => setRecType('hybrid')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    recType === 'hybrid'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                }`}
                            >
                                🎯 Hybrid (Recommended)
                            </button>
                            <button
                                onClick={() => setRecType('personalized')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    recType === 'personalized'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                }`}
                            >
                                🧠 Pure AI Match
                            </button>
                            <button
                                onClick={() => setRecType('popular')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    recType === 'popular'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                }`}
                            >
                                🔥 Popular
                            </button>
                        </div>

                        {/* Algorithm Explanation */}
                        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-600">
                                {recType === 'hybrid' && (
                                    <>
                                        <strong>Hybrid Algorithm:</strong> Combines 70% similarity to your taste + 30% popularity.
                                        Best balance between personalization and quality.
                                    </>
                                )}
                                {recType === 'personalized' && (
                                    <>
                                        <strong>Pure AI Match:</strong> 100% based on vector similarity to your preferences.
                                        May include hidden gems you've never heard of.
                                    </>
                                )}
                                {recType === 'popular' && (
                                    <>
                                        <strong>Popular Movies:</strong> Trending and highly-rated movies.
                                        Great for discovering what everyone else is watching.
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                )}

                {/* Recommendations Grid */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : currentRecs && currentRecs.length > 0 ? (
                    <>
                        <div className="mb-4 text-sm text-gray-600">
                            {currentRecs.length} recommendation{currentRecs.length !== 1 ? 's' : ''} for you
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {currentRecs.map((movie) => (
                                <MovieCard key={movie.id} movie={movie} />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🎬</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No recommendations yet
                        </h3>
                        <p className="text-gray-600 mb-8">
                            Start by rating some movies you've watched to build your taste profile
                        </p>
                        <Link
                            href="/discover"
                            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                        >
                            Discover Movies
                        </Link>
                    </div>
                )}

                {/* How It Works Section */}
                <div className="mt-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-8 border border-indigo-200">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                        🧠 How AI Recommendations Work
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div>
                            <div className="text-3xl mb-2">1️⃣</div>
                            <h4 className="font-semibold text-gray-900 mb-2">Watch & Rate</h4>
                            <p className="text-sm text-gray-600">
                                Rate movies you've watched. The system focuses on your highly-rated movies (7+ stars)
                                to understand what you love.
                            </p>
                        </div>
                        <div>
                            <div className="text-3xl mb-2">2️⃣</div>
                            <h4 className="font-semibold text-gray-900 mb-2">Profile Building</h4>
                            <p className="text-sm text-gray-600">
                                Your ratings are converted into a 1536-dimensional "taste vector" using OpenAI embeddings.
                                This captures themes, styles, and vibes you prefer.
                            </p>
                        </div>
                        <div>
                            <div className="text-3xl mb-2">3️⃣</div>
                            <h4 className="font-semibold text-gray-900 mb-2">Smart Matching</h4>
                            <p className="text-sm text-gray-600">
                                We search our database of {currentRecs?.length || 'thousands of'} movies using vector
                                similarity to find the closest matches to your taste profile.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-indigo-200">
                        <p className="text-sm text-indigo-800">
                            💡 <strong>Pro tip:</strong> The more movies you rate (especially with diverse genres),
                            the better your recommendations become. The system automatically updates your profile
                            whenever you add new ratings!
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}