'use client'

interface RatingStarsProps {
    rating: number // 1-10
    onRate?: (rating: number) => void
    readonly?: boolean
    size?: 'sm' | 'md' | 'lg'
}

export function RatingStars({ rating, onRate, readonly = false, size = 'md' }: RatingStarsProps) {
    const stars = 5
    const normalizedRating = rating / 2 // Convert 1-10 to 1-5

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    }

    const handleClick = (starIndex: number) => {
        if (!readonly && onRate) {
            // Convert 1-5 back to 1-10 (multiply by 2)
            onRate((starIndex + 1) * 2)
        }
    }

    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: stars }).map((_, index) => {
                const isFilled = index < Math.floor(normalizedRating)
                const isHalf = !isFilled && index < normalizedRating

                return (
                    <button
                        key={index}
                        onClick={() => handleClick(index)}
                        disabled={readonly}
                        className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform ${sizeClasses[size]}`}
                        type="button"
                    >
                        {isFilled ? (
                            <svg className="text-yellow-400 fill-current" viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                        ) : isHalf ? (
                            <svg className="text-yellow-400" viewBox="0 0 20 20">
                                <defs>
                                    <linearGradient id={`half-${index}`}>
                                        <stop offset="50%" stopColor="currentColor" />
                                        <stop offset="50%" stopColor="rgb(209 213 219)" stopOpacity="1" />
                                    </linearGradient>
                                </defs>
                                <path
                                    fill={`url(#half-${index})`}
                                    d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"
                                />
                            </svg>
                        ) : (
                            <svg className="text-gray-300 fill-current" viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                        )}
                    </button>
                )
            })}
            {!readonly && (
                <span className="ml-2 text-sm text-gray-600">{rating}/10</span>
            )}
        </div>
    )
}
