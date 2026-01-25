'use client'

import { Link } from "@/navigation"
import Image from "next/image"
import { Star, Tv } from "lucide-react"
import type { TvShow } from '@/lib/api/types'
import { useTranslations } from 'next-intl'

interface TvShowCardProps {
  tvShow: TvShow
}

export function TvShowCard({ tvShow }: TvShowCardProps) {
  const t = useTranslations('Common')

  const posterUrl = tvShow.poster_url
    || (tvShow.poster_path ? `https://image.tmdb.org/t/p/w500${tvShow.poster_path}` : null)
    || '/placeholder.svg'

  const rating = tvShow.vote_average ? (tvShow.vote_average / 2).toFixed(1) : '0.0'
  const year = tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : t('na')

  return (
    <Link href={`/tv-shows/${tvShow.id}`}>
      <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#1a1a2e]/40 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-[#3b82f6]/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]">
        <div className="aspect-[2/3] overflow-hidden relative">
          <Image
            src={posterUrl}
            alt={tvShow.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          />
          {/* TV Badge */}
          <div className="absolute top-2 left-2 bg-[#3b82f6]/90 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1">
            <Tv className="h-3 w-3 text-white" />
            <span className="text-xs font-medium text-white">TV</span>
          </div>
        </div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="mb-1 text-lg font-semibold text-balance text-white line-clamp-2">
              {tvShow.name}
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#9ca3af]">{year}</span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-[#f59e0b] text-[#f59e0b]" />
                <span className="text-sm font-medium text-white">{rating}</span>
              </div>
            </div>
            {tvShow.number_of_seasons && (
              <div className="mt-1 text-xs text-[#9ca3af]">
                {tvShow.number_of_seasons} {t('seasons')}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
