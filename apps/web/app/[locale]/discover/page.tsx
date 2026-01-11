'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { SearchBar } from '@/components/SearchBar'
import { NewMovieCard } from '@/components/NewMovieCard'
import { useSearchMovies, usePopularMovies, useSendChatMessage } from '@/lib/api/hooks'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useTranslations } from 'next-intl'

function DiscoverPageContent() {
    const searchParams = useSearchParams()
    const initialQuery = searchParams.get('q') || ''
    const [searchQuery, setSearchQuery] = useState(initialQuery)
    const { user } = useAuth()
    const [aiExplanation, setAiExplanation] = useState('')
    const sendChatMessage = useSendChatMessage()
    const t = useTranslations('Discover')


    // Update search query when URL changes
    useEffect(() => {
        const query = searchParams.get('q') || ''
        setSearchQuery(query)
    }, [searchParams])

    // RAG search when query changes
    useEffect(() => {
        const performRAGSearch = async () => {
            if (!searchQuery || !user) {
                setAiExplanation('')
                return
            }

            try {
                const response = await sendChatMessage.mutateAsync({
                    userId: user.id,
                    message: searchQuery,
                    includeHistory: false,
                })
                setAiExplanation(response.aiResponse)
            } catch (error) {
                console.error('RAG search error:', error)
                setAiExplanation('')
            }
        }

        performRAGSearch()
    }, [searchQuery, user])

    // Fetch search results when query exists
    const { data: searchResults, isLoading: isSearchLoading } = useSearchMovies({
        query: searchQuery,
        limit: 20,
    })

    // Fetch popular movies as fallback
    const { data: popularMovies, isLoading: isPopularLoading } = usePopularMovies(20)

    // Decide what to display
    const showSearchResults = searchQuery.length > 0
    const movies = showSearchResults ? searchResults : popularMovies
    const isLoading = showSearchResults ? isSearchLoading : isPopularLoading

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f]">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {t('title')}
                    </h1>
                    <p className="text-[#9ca3af]">
                        {showSearchResults
                            ? t('searchResultsFor', { query: searchQuery })
                            : t('popularSubtitle')}
                    </p>
                </div>

                {/* Search Bar */}
                <div className="mb-8">
                    <SearchBar
                        placeholder={t('searchPlaceholder')}
                        defaultValue={initialQuery}
                    />
                    <p className="mt-2 text-sm text-[#9ca3af]">
                        {t('aiTip')}
                    </p>
                </div>
                {/* AI Explanation */}
                {aiExplanation && searchQuery && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-[#e50914]/10 to-[#f59e0b]/10 rounded-lg border border-[#e50914]/20 backdrop-blur-sm">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">🤖</div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-white mb-2">
                                    {t('aiTitle')}
                                </h3>
                                <div className="text-sm text-[#9ca3af] prose prose-sm max-w-none">
                                    {aiExplanation.split('\n').map((line, i) => {
                                        // Parse **bold** markdown safely
                                        const parts = line.split(/(\*\*[^*]+\*\*)/g)
                                        return (
                                            <p key={i} className="mb-2 last:mb-0">
                                                {parts.map((part, j) => {
                                                    if (part.startsWith('**') && part.endsWith('**')) {
                                                        return (
                                                            <strong key={j} className="text-white">
                                                                {part.slice(2, -2)}
                                                            </strong>
                                                        )
                                                    }
                                                    return <span key={j}>{part}</span>
                                                })}
                                            </p>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results */}
                {isLoading || sendChatMessage.isPending ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e50914]"></div>
                    </div>
                ) : movies && movies.length > 0 ? (
                    <>
                        <div className="mb-4 text-sm text-[#9ca3af]">
                            {t('foundCount', { count: movies.length })}
                            {showSearchResults && t('matchingSearch')}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                            {movies.map((movie) => (
                                <NewMovieCard key={movie.id} movie={movie} />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🎬</div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            {t('noMoviesFound')}
                        </h3>
                        <p className="text-[#9ca3af]">
                            {showSearchResults
                                ? t('noMoviesFoundDesc')
                                : t('noMoviesAvailable')}
                        </p>
                    </div>
                )}

                {/* Semantic Search Info */}
                {showSearchResults && movies && movies.length > 0 && (
                    <div className="mt-12 p-6 bg-[#1a1a2e]/40 rounded-lg border border-white/10 backdrop-blur-sm">
                        <h3 className="text-lg font-semibold text-white mb-2">
                            {t('howItWorksTitle')}
                        </h3>
                        <p className="text-[#9ca3af] text-sm leading-relaxed">
                            {t.rich('howItWorksDesc', {
                                strong: (children) => <strong className="text-white">{children}</strong>,
                                em: (children) => <em>{children}</em>,
                                br: () => <br />
                            })}
                        </p>
                    </div>
                )}
            </main>
        </div>
    )
}

export default function DiscoverPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e50914]"></div>
            </div>
        }>
            <DiscoverPageContent />
        </Suspense>
    )
}
