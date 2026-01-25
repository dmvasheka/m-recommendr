'use client'

import { useEffect, useRef } from 'react'

interface InfiniteScrollTriggerProps {
    hasMore: boolean
    isFetching: boolean
    onLoadMore: () => void
    rootMargin?: string
    className?: string
}

export function InfiniteScrollTrigger({
    hasMore,
    isFetching,
    onLoadMore,
    rootMargin = '200px',
    className = '',
}: InfiniteScrollTriggerProps) {
    const triggerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!hasMore || isFetching) return

        const target = triggerRef.current
        if (!target) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && !isFetching && hasMore) {
                    onLoadMore()
                }
            },
            { root: null, rootMargin, threshold: 0 }
        )

        observer.observe(target)

        return () => observer.disconnect()
    }, [hasMore, isFetching, onLoadMore, rootMargin])

    return <div ref={triggerRef} className={className} aria-hidden />
}
