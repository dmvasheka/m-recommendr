'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { SearchBar } from '@/components/SearchBar'
import { MovieCard } from '@/components/MovieCard'
import { useSearchMovies, usePopularMovies, useSendChatMessage } from '@/lib/api/hooks'
import { useAuth } from '@/lib/auth/AuthProvider'

function DiscoverPageContent() {
    const searchParams = useSearchParams()
    const initialQuery = searchParams.get('q') || ''
    const [searchQuery, setSearchQuery] = useState(initialQuery)
    const { user } = useAuth()
    const [aiExplanation, setAiExplanation] = useState('')
    const sendChatMessage = useSendChatMessage()


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
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Discover Movies
                    </h1>
                    <p className="text-gray-600">
                        {showSearchResults
                            ? `Search results for "${searchQuery}"`
                            : 'Popular movies and trending picks'}
                    </p>
                </div>

                {/* Search Bar */}
                <div className="mb-8">
                    <SearchBar
                        placeholder="Search by title or describe what you want: 'uplifting adventure' or 'sci-fi thriller'..."
                        defaultValue={initialQuery}
                    />
                    <p className="mt-2 text-sm text-gray-500">
                        💡🤖 AI-powered search: Use natural language or search by title - we'll find the perfect match
                    </p>
                </div>
                {/* AI Explanation */}
                {aiExplanation && searchQuery && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">🤖</div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-indigo-900 mb-2">
                                    AI Recommendations
                                </h3>
                                <div className="text-sm text-indigo-800 prose prose-sm max-w-none">
                                    {aiExplanation.split('\n').map((line, i) => {
                                        const boldFormatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                        return (
                                            <p
                                                key={i}
                                                className="mb-2 last:mb-0"
                                                dangerouslySetInnerHTML={{ __html: boldFormatted }}
                                            />
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
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : movies && movies.length > 0 ? (
                    <>
                        <div className="mb-4 text-sm text-gray-600">
                            Found {movies.length} movie{movies.length !== 1 ? 's' : ''}
                            {showSearchResults && ' matching your search'}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {movies.map((movie) => (
                                <MovieCard key={movie.id} movie={movie} />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🎬</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No movies found
                        </h3>
                        <p className="text-gray-600">
                            {showSearchResults
                                ? 'Try a different search term or browse popular movies'
                                : 'No movies available at the moment'}
                        </p>
                    </div>
                )}

                {/* Semantic Search Info */}
                {showSearchResults && movies && movies.length > 0 && (
                    <div className="mt-12 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
                        <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                            🤖 How AI-Powered Search Works
                        </h3>
                        <p className="text-indigo-800 text-sm leading-relaxed">
                            We use <strong>Retrieval-Augmented Generation (RAG)</strong> combining semantic search with GPT-4.
                            Your query is converted into a vector embedding, matched against our movie database,
                            then GPT-4 analyzes enriched metadata (keywords, cast, crew, themes) to explain
                            <em> why</em> each movie fits your request. This gives you intelligent recommendations
                            with context, not just keyword matching!
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        }>
            <DiscoverPageContent />
        </Suspense>
    )
}