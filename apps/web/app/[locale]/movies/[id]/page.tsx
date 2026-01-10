'use client'

import Image from 'next/image'
import { Navbar } from '@/components/Navbar'
import { MovieCard } from '@/components/MovieCard'
import { WatchlistButton } from '@/components/WatchlistButton'
import { useMovie, useSimilarMovies } from '@/lib/api/hooks'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'

interface PageProps {
    params: { id: string }
}

export default function MovieDetailsPage({ params }: PageProps) {
    const movieId = parseInt(params.id)
    const t = useTranslations('MovieDetails')

    const { data: movie, isLoading, error } = useMovie(movieId)
    const { data: similarMovies } = useSimilarMovies({
        movieId,
        limit: 8,
    })

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f]">
                <Navbar />
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e50914]"></div>
                </div>
            </div>
        )
    }

    if (error || !movie) {
        return (
            <div className="min-h-screen bg-[#0a0a0f]">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                    <div className="text-6xl mb-4">😢</div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('notFound')}</h1>
                    <p className="text-[#9ca3af] mb-8">
                        {t('notFoundDesc')}
                    </p>
                    <Link
                        href="/discover"
                        className="inline-block px-6 py-3 bg-[#e50914] text-white rounded-lg hover:bg-[#e50914]/90 transition"
                    >
                        {t('browseMovies')}
                    </Link>
                </div>
            </div>
        )
    }

    const backdropUrl = (movie as any).backdrop_url
        || (movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null)

    const posterUrl = (movie as any).poster_url
        || (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null)
        || '/placeholder-movie.jpg'

    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : t('na')
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : t('na')
    const runtime = movie.runtime ? t('runtime', { minutes: movie.runtime }) : t('na')

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <Navbar />

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
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/70 to-transparent" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700" />
                )}

                <div className="absolute bottom-0 left-0 right-0">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-shrink-0">
                                <div className="relative w-48 h-72 rounded-lg overflow-hidden shadow-2xl border border-white/10">
                                    <Image
                                        src={posterUrl}
                                        alt={movie.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 text-white">
                                <h1 className="text-4xl md:text-5xl font-bold mb-2">
                                    {movie.title}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 text-sm mb-4 text-[#9ca3af]">
                                      <span className="flex items-center gap-1">
                                          ⭐ <strong className="text-white">{rating}</strong> ({movie.vote_count} {t('votes')})
                                      </span>
                                    <span>📅 {year}</span>
                                    <span>⏱️ {runtime}</span>
                                    {movie.original_language && (
                                        <span className="uppercase bg-white/20 px-2 py-1 rounded text-xs">
                                              {movie.original_language}
                                          </span>
                                    )}
                                </div>

                                {movie.genres && movie.genres.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {movie.genres.map((genre) => (
                                            <span
                                                key={genre}
                                                className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-[#9ca3af]"
                                            >
                                                  {genre}
                                              </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <WatchlistButton movieId={movie.id} variant="button" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {((movie as any).description || movie.overview) && (
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-white mb-4">{t('overview')}</h2>
                        <p className="text-[#9ca3af] text-lg leading-relaxed">
                            {(movie as any).description || movie.overview}
                        </p>
                    </section>
                )}

                {similarMovies && similarMovies.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">{t('moreLikeThis')}</h2>
                            <span className="text-sm text-[#9ca3af]">
                                  {t('aiSimilarity')}
                              </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
                            {similarMovies.map((movie) => (
                                <MovieCard key={movie.id} movie={movie} />
                            ))}
                        </div>
                        <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
                            <p className="text-sm text-[#9ca3af]">
                                💡 {t('aiDescription')}
                            </p>
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}
