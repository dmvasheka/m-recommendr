'use client'

import Link from "next/link"
import Image from "next/image"
import { Star } from "lucide-react"
import type { Movie } from '@/lib/api/types'

interface MovieCardProps {
  movie: Movie
}

export function NewMovieCard({ movie }: MovieCardProps) {
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder.svg'

  const rating = movie.vote_average ? (movie.vote_average / 2).toFixed(1) : '0.0'
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'

  return (
    <Link href={`/movie/${movie.id}`}>
      <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#1a1a2e]/40 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-[#e50914]/30 hover:shadow-[0_0_30px_rgba(229,9,20,0.15)]">
        <div className="aspect-[2/3] overflow-hidden relative">
          <Image
            src={posterUrl}
            alt={movie.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          />
        </div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="mb-1 text-lg font-semibold text-balance text-white line-clamp-2">
              {movie.title}
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#9ca3af]">{year}</span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-[#f59e0b] text-[#f59e0b]" />
                <span className="text-sm font-medium text-white">{rating}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
