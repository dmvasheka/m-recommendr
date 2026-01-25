'use client'

import { useState, useEffect } from 'react'
import { Navigation } from '@/components/Navigation'
import { TvShowCard } from '@/components/TvShowCard'
import { InfiniteScrollTrigger } from '@/components/InfiniteScrollTrigger'
import { useInfiniteTvShows, useInfiniteSearchTvShows } from '@/lib/api/hooks'
import { useTranslations, useLocale } from 'next-intl'
import { Search, Tv } from 'lucide-react'

export default function TvShowsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')
    const isDev = process.env.NODE_ENV === 'development'
    const locale = useLocale()
    const t = useTranslations('TvShows')

    const handleSearchChange = (value: string) => {
        setSearchQuery(value)
    }

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedQuery(searchQuery)
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [searchQuery])

    const {
        data: tvShowsPages,
        isLoading: isLoadingAll,
        isError: isErrorAll,
        error: errorAll,
        refetch: refetchAll,
        fetchNextPage: fetchNextAll,
        hasNextPage: hasNextAll,
        isFetchingNextPage: isFetchingNextAll,
    } = useInfiniteTvShows(40, locale)
    const {
        data: searchPages,
        isLoading: isSearching,
        isError: isErrorSearch,
        error: errorSearch,
        refetch: refetchSearch,
        fetchNextPage: fetchNextSearch,
        hasNextPage: hasNextSearch,
        isFetchingNextPage: isFetchingNextSearch,
    } = useInfiniteSearchTvShows({
        query: debouncedQuery,
        limit: 40,
        language: locale,
        pageSize: 40,
    })

    const showSearchResults = debouncedQuery.length >= 2
    const displayShows = showSearchResults
        ? (searchPages?.pages.flatMap((page) => page.items) ?? [])
        : (tvShowsPages?.pages.flatMap((page) => page.items) ?? [])
    const isLoading = showSearchResults ? isSearching : isLoadingAll
    const isError = showSearchResults ? isErrorSearch : isErrorAll
    const error = showSearchResults ? errorSearch : errorAll
    const refetch = showSearchResults ? refetchSearch : refetchAll
    const isFetchingNextPage = showSearchResults ? isFetchingNextSearch : isFetchingNextAll
    const hasNextPage = showSearchResults ? hasNextSearch : hasNextAll
    const fetchNextPage = showSearchResults ? fetchNextSearch : fetchNextAll

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f]">
            <Navigation />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-[#3b82f6]/20 rounded-lg">
                            <Tv className="h-6 w-6 text-[#3b82f6]" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">
                            {t('title')}
                        </h1>
                    </div>
                    <p className="text-[#9ca3af]">
                        {showSearchResults
                            ? t('searchResultsFor', { query: debouncedQuery })
                            : t('subtitle')}
                    </p>
                </div>

                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                            className="w-full pl-12 pr-4 py-3 bg-[#1a1a2e]/80 border border-white/10 rounded-xl text-white placeholder:text-[#9ca3af] focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
                        />
                    </div>
                </div>

                {/* Results */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b82f6]"></div>
                    </div>
                ) : isError ? (
                    <div className="text-center py-20 text-[#9ca3af]">
                        <div className="mb-2 text-red-400">{t('loadError')}</div>
                        <button
                            onClick={() => refetch()}
                            className="text-sm underline text-[#3b82f6] hover:text-[#60a5fa]"
                        >
                            {t('retry')}
                        </button>
                        {error ? (
                            <div className="mt-2 text-xs text-[#6b7280]">
                                {isDev
                                    ? (error instanceof Error ? error.message : String(error))
                                    : t('loadErrorDetails')}
                            </div>
                        ) : null}
                    </div>
                ) : displayShows.length > 0 ? (
                    <>
                        <div className="mb-4 text-sm text-[#9ca3af]">
                            {t('foundCount', { count: displayShows.length })}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                            {displayShows.map((tvShow) => (
                                <TvShowCard key={tvShow.id} tvShow={tvShow} />
                            ))}
                        </div>
                        {isFetchingNextPage && (
                            <div className="flex justify-center items-center py-10">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3b82f6]"></div>
                            </div>
                        )}
                        {hasNextPage === false && (
                            <div className="text-center py-10 text-sm text-[#9ca3af]">
                                {t('endOfList')}
                            </div>
                        )}
                        {hasNextPage && (
                            <InfiniteScrollTrigger
                                hasMore={!!hasNextPage}
                                isFetching={isFetchingNextPage}
                                onLoadMore={() => fetchNextPage()}
                            />
                        )}
                    </>
                ) : (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📺</div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            {t('noShowsFound')}
                        </h3>
                        <p className="text-[#9ca3af]">
                            {showSearchResults
                                ? t('noShowsFoundDesc')
                                : t('noShowsAvailable')}
                        </p>
                    </div>
                )}
            </main>
        </div>
    )
}
