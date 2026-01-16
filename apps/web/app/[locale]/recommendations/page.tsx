'use client'

import { useState } from 'react'
import { Navigation } from '@/components/Navigation'
import { NewMovieCard } from '@/components/NewMovieCard'
import { useAuth } from '@/lib/auth/AuthProvider'
import {
    useRecommendations,
    useHybridRecommendations,
    usePopularMovies,
    useWatchlist,
} from '@/lib/api/hooks'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'

type RecommendationType = 'personalized' | 'hybrid' | 'popular'

export default function RecommendationsPage() {
    const { user } = useAuth()
    const [recType, setRecType] = useState<RecommendationType>('hybrid')
    const t = useTranslations('Recommendations')
    const tNav = useTranslations('Navigation')

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

    // Normalize recommendations to Movie[] format
    const normalizedMovies = currentRecs?.map((item) =>
        'movie' in item ? item.movie : item
    )

    const isLoading = showPersonalized
        ? isPersonalizedLoading
        : showHybrid
            ? isHybridLoading
            : isPopularLoading

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f]">
            <Navigation />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
                    <p className="text-[#9ca3af]">
                        {t('subtitle')}
                    </p>
                </div>

                {/* Stats Card */}
                <div className="mb-8 bg-gradient-to-r from-[#e50914]/20 to-[#f59e0b]/20 border border-[#e50914]/30 rounded-lg p-6 text-white backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold mb-2">{t('profile')}</h2>
                            <div className="flex gap-6 text-sm">
                                <div>
                                    <span className="opacity-90">{t('watched')}:</span>{' '}
                                    <strong>{watchedCount}</strong> {t('movies')}
                                </div>
                                <div>
                                    <span className="opacity-90">{t('highlyRated')}:</span>{' '}
                                    <strong>{ratedCount}</strong> {t('movies')}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            {hasProfile ? (
                                <div>
                                    <div className="text-3xl mb-1">✨</div>
                                    <div className="text-sm opacity-90">{t('profileActive')}</div>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-3xl mb-1">🌱</div>
                                    <div className="text-sm opacity-90">{t('gettingStarted')}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {!hasProfile && (
                        <div className="mt-4 pt-4 border-t border-white/20">
                            <p className="text-sm opacity-90">
                                {t('unlockTip')}
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
                                        ? 'bg-[#e50914] text-white'
                                        : 'bg-[#1a1a2e]/40 text-[#9ca3af] hover:bg-[#1a1a2e]/60 border border-white/10'
                                }`}
                            >
                                {t('types.hybrid')}
                            </button>
                            <button
                                onClick={() => setRecType('personalized')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    recType === 'personalized'
                                        ? 'bg-[#e50914] text-white'
                                        : 'bg-[#1a1a2e]/40 text-[#9ca3af] hover:bg-[#1a1a2e]/60 border border-white/10'
                                }`}
                            >
                                {t('types.personalized')}
                            </button>
                            <button
                                onClick={() => setRecType('popular')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    recType === 'popular'
                                        ? 'bg-[#e50914] text-white'
                                        : 'bg-[#1a1a2e]/40 text-[#9ca3af] hover:bg-[#1a1a2e]/60 border border-white/10'
                                }`}
                            >
                                {t('types.popular')}
                            </button>
                        </div>

                        {/* Algorithm Explanation */}
                        <div className="mt-4 p-4 bg-[#1a1a2e]/40 rounded-lg border border-white/10 backdrop-blur-sm">
                            <p className="text-sm text-[#9ca3af]">
                                {t.rich(`algorithms.${recType}`, {
                                    strong: (children) => <strong className="text-white">{children}</strong>,
                                    em: (children) => <em>{children}</em>,
                                    br: () => <br />
                                })}
                            </p>
                        </div>
                    </div>
                )}

                {/* Recommendations Grid */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e50914]"></div>
                    </div>
                ) : normalizedMovies && normalizedMovies.length > 0 ? (
                    <>
                        <div className="mb-4 text-sm text-[#9ca3af]">
                            {t('count', { count: normalizedMovies.length })}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                            {normalizedMovies.map((movie) => (
                                <NewMovieCard key={movie.id} movie={movie} />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🎬</div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            {t('empty')}
                        </h3>
                        <p className="text-[#9ca3af] mb-8">
                            {t('emptyDesc')}
                        </p>
                        <Link
                            href="/discover"
                            className="inline-block px-6 py-3 bg-[#e50914] text-white rounded-lg hover:bg-[#e50914]/90 transition"
                        >
                            {tNav('discoverMovies')}
                        </Link>
                    </div>
                )}

                {/* How It Works Section */}
                <div className="mt-12 bg-[#1a1a2e]/40 rounded-lg p-8 border border-white/10 backdrop-blur-sm">
                    <h3 className="text-2xl font-bold text-white mb-4">
                        {t('howItWorks.title')}
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div>
                            <div className="text-3xl mb-2">1️⃣</div>
                            <h4 className="font-semibold text-white mb-2">{t('howItWorks.step1Title')}</h4>
                            <p className="text-sm text-[#9ca3af]">
                                {t('howItWorks.step1Desc')}
                            </p>
                        </div>
                        <div>
                            <div className="text-3xl mb-2">2️⃣</div>
                            <h4 className="font-semibold text-white mb-2">{t('howItWorks.step2Title')}</h4>
                            <p className="text-sm text-[#9ca3af]">
                                {t('howItWorks.step2Desc')}
                            </p>
                        </div>
                        <div>
                            <div className="text-3xl mb-2">3️⃣</div>
                            <h4 className="font-semibold text-white mb-2">{t('howItWorks.step3Title')}</h4>
                            <p className="text-sm text-[#9ca3af]">
                                {t('howItWorks.step3Desc')}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-sm text-[#9ca3af]">
                            {t.rich('howItWorks.proTip', {
                                strong: (children) => <strong className="text-white">{children}</strong>,
                                em: (children) => <em>{children}</em>,
                                br: () => <br />
                            })}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}
