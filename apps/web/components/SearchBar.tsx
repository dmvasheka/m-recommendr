'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from '@/navigation'
import { useAutocomplete } from '@/lib/api/hooks'
import Image from 'next/image'
import { Search, X, Star } from 'lucide-react'

interface SearchBarProps {
    placeholder?: string
    onSearch?: (query: string) => void
    defaultValue?: string
}

export function SearchBar({
                              placeholder = 'Search movies...',
                              onSearch,
                              defaultValue = ''
                          }: SearchBarProps) {
    const [query, setQuery] = useState(defaultValue)
    const [debouncedQuery, setDebouncedQuery] = useState(defaultValue)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const router = useRouter()
    const containerRef = useRef<HTMLDivElement>(null)

    // Debounce query for better performance
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query)
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    // Use our new autocomplete hook with debounced query
    const { data: suggestions, isLoading } = useAutocomplete(debouncedQuery, 6)

    // Handle clicks outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (query.trim()) {
            setShowSuggestions(false)
            router.push(`/discover?q=${encodeURIComponent(query)}`)
        }
    }

    const handleSelectMovie = (movieId: number) => {
        setQuery('')
        setShowSuggestions(false)
        router.push(`/movies/${movieId}`)
    }

    return (
        <div className="relative w-full" ref={containerRef}>
            <form onSubmit={handleSubmit} className="relative z-20">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 pl-12 bg-white/10 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e50914] focus:border-transparent placeholder:text-gray-400 backdrop-blur-sm transition-all"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                
                {query && (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('')
                            setShowSuggestions(false)
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && query.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-400 text-sm">
                            <div className="animate-spin inline-block w-4 h-4 border-2 border-[#e50914] border-t-transparent rounded-full mr-2" />
                            Searching...
                        </div>
                    ) : suggestions && suggestions.length > 0 ? (
                        <div className="max-h-[400px] overflow-y-auto">
                            {suggestions.map((movie) => {
                                const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'
                                const posterUrl = movie.poster_url
                                    || (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null)
                                    || '/placeholder-movie.jpg'
                                
                                return (
                                    <button
                                        key={movie.id}
                                        onClick={() => handleSelectMovie(movie.id)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left group"
                                    >
                                        <div className="relative w-10 h-14 flex-shrink-0 rounded overflow-hidden">
                                            <Image
                                                src={posterUrl}
                                                alt={movie.title}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-medium truncate group-hover:text-[#e50914] transition-colors">
                                                {movie.title}
                                            </h4>
                                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                                <span>{year}</span>
                                                {movie.vote_average && (
                                                    <div className="flex items-center gap-1">
                                                        <Star className="w-3 h-3 fill-[#f59e0b] text-[#f59e0b]" />
                                                        <span>{movie.vote_average.toFixed(1)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                            
                            <button
                                onClick={handleSubmit}
                                className="w-full p-3 bg-white/5 text-[#e50914] text-sm font-medium hover:bg-white/10 transition-all text-center"
                            >
                                See all results for &quot;{query}&quot;
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 text-center text-gray-400 text-sm">
                            No movies found for &quot;{query}&quot;
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}