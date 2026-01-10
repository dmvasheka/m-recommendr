'use client'

import Image from 'next/image'
import { Link } from '@/navigation'
import type { Movie } from '@/lib/api/types'
import { useTranslations } from 'next-intl'

interface MovieCardProps {
    movie: Movie
    showRating?: boolean
}

export function MovieCard({ movie, showRating = true }: MovieCardProps) {
    const t = useTranslations('Common')
    // Handle both poster_url (full URL from backend) and poster_path (path only)
    const posterUrl = (movie as any).poster_url
        || (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null)
        || '/placeholder-movie.jpg'

    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : t('na')

    return (
        <Link href={`/movies/${movie.id}`}>
            <div className="group cursor-pointer">
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-gray-200">
                    <Image
                        src={posterUrl}
                        alt={movie.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                    {showRating && movie.vote_average && (
                        <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded-md text-sm font-semibold">
                            ⭐ {movie.vote_average.toFixed(1)}
                        </div>
                    )}
                </div>
                <div className="mt-2">
                    <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {movie.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{year}</p>
                </div>
            </div>
        </Link>
    )
}