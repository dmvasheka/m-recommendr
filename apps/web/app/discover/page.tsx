'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { SearchBar } from '@/components/SearchBar'
import { MovieCard } from '@/components/MovieCard'
import { useSearchMovies, usePopularMovies } from '@/lib/api/hooks'

export default function DiscoverPage() {
    const searchParams = useSearchParams()
    const initialQuery = searchParams.get('q') || ''
    const [searchQuery, setSearchQuery] = useState(initialQuery)

    // Update search query when URL changes
    useEffect(() => {
        const query = searchParams.get('q') || ''
        setSearchQuery(query)
    }, [searchParams])

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
                        placeholder="Try: 'space exploration with emotional depth' or 'funny time travel movies'"
                        defaultValue={initialQuery}
                    />
                    <p className="mt-2 text-sm text-gray-500">
                        💡 Use natural language to describe the kind of movie you want to watch
                    </p>
                </div>

                {/* Results */}
                {isLoading ? (
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
                            🧠 How Semantic Search Works
                        </h3>
                        <p className="text-indigo-800 text-sm leading-relaxed">
                            We use AI embeddings to understand the <strong>meaning</strong> behind your search,
                            not just keywords. Your query is converted into a 1536-dimensional vector and compared
                            with movie embeddings to find the best semantic matches. This means you can describe
                            the vibe, themes, or feeling you're looking for, and we'll find movies that match!
                        </p>
                    </div>
                )}
            </main>
        </div>
    )
}