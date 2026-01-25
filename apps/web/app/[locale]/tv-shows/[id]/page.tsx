'use client'

import Image from 'next/image'
import { Navigation } from '@/components/Navigation'
import { useTvShow, useTvShowSeasons } from '@/lib/api/hooks'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/navigation'
import { Tv, Calendar, Star, Globe, Film, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { TvSeason } from '@/lib/api/types'

interface PageProps {
    params: { id: string }
}

export default function TvShowDetailsPage({ params }: PageProps) {
    const tvShowId = parseInt(params.id)
    const t = useTranslations('TvShowDetails')
    const locale = useLocale()

    const { data: tvShow, isLoading, error } = useTvShow(tvShowId, locale)
    const { data: seasons, isLoading: isLoadingSeasons } = useTvShowSeasons(tvShowId)
    const [expandedSeason, setExpandedSeason] = useState<number | null>(null)

    const formatDate = (dateString: string | null): string => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toLocaleDateString(locale === 'uk' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f]">
                <Navigation />
                <div className="flex justify-center items-center py-20 pt-32">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b82f6]"></div>
                </div>
            </div>
        )
    }

    if (error || !tvShow) {
        return (
            <div className="min-h-screen bg-[#0a0a0f]">
                <Navigation />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pt-32 text-center">
                    <div className="text-6xl mb-4">😢</div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('notFound')}</h1>
                    <p className="text-[#9ca3af] mb-8">
                        {t('notFoundDesc')}
                    </p>
                    <Link
                        href="/tv-shows"
                        className="inline-block px-6 py-3 bg-[#3b82f6] text-white rounded-lg hover:bg-[#3b82f6]/90 transition"
                    >
                        {t('browseShows')}
                    </Link>
                </div>
            </div>
        )
    }

    const backdropUrl = tvShow.backdrop_url
        || (tvShow.backdrop_path ? `https://image.tmdb.org/t/p/original${tvShow.backdrop_path}` : null)

    const posterUrl = tvShow.poster_url
        || (tvShow.poster_path ? `https://image.tmdb.org/t/p/w500${tvShow.poster_path}` : null)
        || '/placeholder-movie.jpg'

    const year = tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : t('na')
    const rating = tvShow.vote_average ? tvShow.vote_average.toFixed(1) : t('na')

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <Navigation />

            <div className="relative h-[500px] w-full">
                {backdropUrl ? (
                    <>
                        <Image
                            src={backdropUrl}
                            alt={tvShow.name}
                            fill
                            className="object-cover"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/70 to-transparent" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700" />
                )}

                <div className="absolute bottom-0 left-0 right-0">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-shrink-0">
                                <div className="relative w-48 h-72 rounded-lg overflow-hidden shadow-2xl border border-white/10">
                                    <Image
                                        src={posterUrl}
                                        alt={tvShow.name}
                                        fill
                                        className="object-cover"
                                    />
                                    {/* TV Badge */}
                                    <div className="absolute top-2 left-2 bg-[#3b82f6]/90 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1">
                                        <Tv className="h-3 w-3 text-white" />
                                        <span className="text-xs font-medium text-white">{t('tvBadge')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 text-white">
                                <h1 className="text-4xl md:text-5xl font-bold mb-2">
                                    {tvShow.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 text-sm mb-4 text-[#9ca3af]">
                                    <span className="flex items-center gap-1">
                                        <Star className="h-4 w-4 fill-[#f59e0b] text-[#f59e0b]" />
                                        <strong className="text-white">{rating}</strong>
                                        {tvShow.vote_count && ` (${tvShow.vote_count} ${t('votes')})`}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {year}
                                    </span>
                                    {tvShow.number_of_seasons && (
                                        <span className="flex items-center gap-1">
                                            <Film className="h-4 w-4" />
                                            {tvShow.number_of_seasons} {t('seasons')}
                                        </span>
                                    )}
                                    {tvShow.number_of_episodes && (
                                        <span>{tvShow.number_of_episodes} {t('episodes')}</span>
                                    )}
                                    {tvShow.original_language && (
                                        <span className="flex items-center gap-1">
                                            <Globe className="h-4 w-4" />
                                            <span className="uppercase">{tvShow.original_language}</span>
                                        </span>
                                    )}
                                </div>

                                {tvShow.status && (
                                    <div className="mb-4">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                            tvShow.status === 'Returning Series'
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : tvShow.status === 'Ended'
                                                ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                        }`}>
                                            {tvShow.status}
                                        </span>
                                    </div>
                                )}

                                {tvShow.genres && tvShow.genres.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {tvShow.genres.map((genre) => (
                                            <span
                                                key={genre}
                                                className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-[#9ca3af]"
                                            >
                                                {genre}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {tvShow.overview && (
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-white mb-4">{t('overview')}</h2>
                        <p className="text-[#9ca3af] text-lg leading-relaxed">
                            {tvShow.overview}
                        </p>
                    </section>
                )}

                {/* Seasons Section */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-white mb-6">{t('seasonsSection')}</h2>

                    {isLoadingSeasons ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6]"></div>
                        </div>
                    ) : seasons && seasons.length > 0 ? (
                        <div className="space-y-3">
                            {seasons.map((season: TvSeason) => (
                                <div
                                    key={season.id}
                                    className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
                                >
                                    <button
                                        onClick={() => setExpandedSeason(expandedSeason === season.id ? null : season.id)}
                                        className="w-full px-4 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            {season.poster_url && (
                                                <div className="relative w-12 h-18 rounded overflow-hidden flex-shrink-0">
                                                    <Image
                                                        src={season.poster_url}
                                                        alt={season.name || `Season ${season.season_number}`}
                                                        width={48}
                                                        height={72}
                                                        className="object-cover"
                                                    />
                                                </div>
                                            )}
                                            <div className="text-left">
                                                <h3 className="text-lg font-semibold text-white">
                                                    {season.season_number === 0
                                                        ? t('specials')
                                                        : t('seasonTitle', { number: season.season_number })
                                                    }
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-3 text-sm text-[#9ca3af]">
                                                    {season.episode_count && (
                                                        <span className="flex items-center gap-1">
                                                            <Film className="h-3.5 w-3.5" />
                                                            {t('episodesCount', { count: season.episode_count })}
                                                        </span>
                                                    )}
                                                    {season.air_date && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {formatDate(season.air_date)}
                                                        </span>
                                                    )}
                                                    {season.vote_average && season.vote_average > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" />
                                                            {season.vote_average.toFixed(1)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {season.overview && (
                                            expandedSeason === season.id
                                                ? <ChevronUp className="h-5 w-5 text-[#9ca3af]" />
                                                : <ChevronDown className="h-5 w-5 text-[#9ca3af]" />
                                        )}
                                    </button>

                                    {expandedSeason === season.id && season.overview && (
                                        <div className="px-4 pb-4 border-t border-white/10">
                                            <p className="text-[#9ca3af] text-sm leading-relaxed pt-4">
                                                {season.overview}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[#9ca3af] text-center py-8">{t('noSeasons')}</p>
                    )}
                </section>

                {/* Back to TV Shows */}
                <div className="mt-8">
                    <Link
                        href="/tv-shows"
                        className="inline-flex items-center gap-2 text-[#3b82f6] hover:text-[#3b82f6]/80 transition-colors"
                    >
                        <span>←</span>
                        <span>{t('backToShows')}</span>
                    </Link>
                </div>
            </main>
        </div>
    )
}
