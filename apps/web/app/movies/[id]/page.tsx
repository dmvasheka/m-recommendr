'use client'

import { use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { MovieCard } from '@/components/MovieCard'
import { WatchlistButton } from '@/components/WatchlistButton'
import { useMovie, useSimilarMovies } from '@/lib/api/hooks'

interface PageProps {
    params: Promise<{ id: string }>
}

export default function MovieDetailsPage({ params }: PageProps) {
    const { id } = use(params)
    const movieId = parseInt(id)

    const { data: movie, isLoading, error } = useMovie(movieId)
    const { data: similarMovies } = useSimilarMovies({
        movieId,
        limit: 8,
    })

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </div>
        )
    }

    if (error || !movie) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                    <div className="text-6xl mb-4">😢</div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Movie Not Found</h1>
                    <p className="text-gray-600 mb-8">
                        The movie you're looking for doesn't exist or has been removed.
                    </p>
                    <Link
                        href="/discover"
                        className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                        Browse Movies
                    </Link>
                </div>
            </div>
        )
    }

    const backdropUrl = movie.backdrop_path
        ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
        : null

    const posterUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : '/placeholder-movie.jpg'

    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'
    const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A'

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {/* Hero Section with Backdrop */}
            <div className="relative h-[500px] w-full">
                {backdropUrl ? (
                    <>
                        <Image
                            src={backdropUrl}
                            alt={movie.title}
                            fill
                            className="object-cover"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700" />
                )}

                {/* Movie Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Poster */}
                            <div className="flex-shrink-0">
                                <div className="relative w-48 h-72 rounded-lg overflow-hidden shadow-2xl">
                                    <Image
                                        src={posterUrl}
                                        alt={movie.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-white">
                                <h1 className="text-4xl md:text-5xl font-bold mb-2">
                                    {movie.title}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
                                      <span className="flex items-center gap-1">
                                          ⭐ <strong>{rating}</strong> ({movie.vote_count} votes)
                                      </span>
                                    <span>📅 {year}</span>
                                    <span>⏱️ {runtime}</span>
                                    {movie.original_language && (
                                        <span className="uppercase bg-white/20 px-2 py-1 rounded">
                                              {movie.original_language}
                                          </span>
                                    )}
                                </div>

                                {/* Genres */}
                                {movie.genres && movie.genres.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {movie.genres.map((genre) => (
                                            <span
                                                key={genre}
                                                className="px-3 py-1 bg-indigo-600/80 rounded-full text-sm"
                                            >
                                                  {genre}
                                              </span>
                                        ))}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-4">
                                    <WatchlistButton movieId={movie.id} variant="button" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Overview */}
                {movie.overview && (
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
                        <p className="text-gray-700 text-lg leading-relaxed">{movie.overview}</p>
                    </section>
                )}

                {/* Similar Movies */}
                {similarMovies && similarMovies.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">More Like This</h2>
                            <span className="text-sm text-gray-500">
                                  Based on AI similarity
                              </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
                            {similarMovies.map((movie) => (
                                <MovieCard key={movie.id} movie={movie} />
                            ))}
                        </div>
                        <div className="mt-8 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                            <p className="text-sm text-indigo-800">
                                💡 These recommendations are generated using vector similarity search
                                on movie embeddings. The AI compares this movie's themes, plot, and
                                style with our entire database to find the closest matches.
                            </p>
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}