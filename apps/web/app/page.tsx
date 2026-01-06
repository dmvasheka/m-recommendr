'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Sparkles, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NewMovieCard } from "@/components/NewMovieCard"
import { usePopularMovies } from "@/lib/api/hooks"
import { useAuth } from "@/lib/auth/AuthProvider"
import { useState } from "react"

export default function Page() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const { data: popularMovies, isLoading } = usePopularMovies(16)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/discover?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-[#e50914]" />
              <span className="text-lg sm:text-xl font-semibold text-white">Movie Recommendr</span>
            </Link>
            <Link
              href="/discover"
              className="text-sm sm:text-base text-[#9ca3af] hover:text-white transition-colors"
            >
              Discover
            </Link>
            {user && (
              <Link
                href="/watchlist"
                className="flex items-center gap-2 text-sm sm:text-base text-[#9ca3af] hover:text-white transition-colors"
              >
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">Watchlist</span>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/recommendations"
                  className="hidden sm:block text-sm text-[#9ca3af] hover:text-white transition-colors"
                >
                  Recommendations
                </Link>
                <Link
                  href="/chat"
                  className="hidden sm:block text-sm text-[#9ca3af] hover:text-white transition-colors"
                >
                  AI Chat
                </Link>
              </>
            ) : (
              <Link href="/auth/login">
                <Button
                  variant="outline"
                  className="border-white/10 bg-transparent text-sm sm:text-base text-white hover:bg-white/5"
                >
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-4 pt-20 pb-8 sm:px-6 sm:pt-28 sm:pb-12">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="relative mx-auto max-w-4xl text-center">
          {/* AI Badge */}
          <div className="mb-3 sm:mb-4 inline-flex items-center gap-2 rounded-full border border-[#e50914]/20 bg-[#e50914]/5 px-3 py-1 shadow-[0_0_20px_rgba(229,9,20,0.1)]">
            <Sparkles className="h-3.5 w-3.5 text-[#e50914]" />
            <span className="text-xs font-medium text-[#e50914]">GPT-4 Powered</span>
          </div>

          {/* Headline */}
          <h1 className="mb-3 sm:mb-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-balance tracking-tight text-white">
            Discover Movies
            <span className="bg-gradient-to-r from-[#e50914] to-[#b20710] bg-clip-text text-transparent">
              {" "}
              Powered by AI
            </span>
          </h1>

          {/* Subheading */}
          <p className="mb-5 sm:mb-6 text-sm sm:text-base text-balance text-[#9ca3af]">
            Intelligent recommendations based on your taste
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="group relative mx-auto max-w-2xl">
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[#e50914] to-[#b20710] opacity-0 blur transition duration-300 group-focus-within:opacity-20" />
            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 rounded-xl border border-white/10 bg-[#1a1a2e]/80 px-3 sm:px-4 py-3 backdrop-blur-xl transition-all duration-300 group-focus-within:border-[#e50914]/50">
              <div className="flex items-center gap-3 flex-1">
                <Search className="h-5 w-5 text-[#9ca3af]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title or describe what you want..."
                  className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder:text-[#9ca3af] focus:outline-none"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="h-10 sm:h-9 rounded-lg bg-gradient-to-r from-[#f59e0b] to-[#d97706] px-6 text-sm font-semibold text-white shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]"
              >
                Search
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Featured Movies Section */}
      <section className="px-4 pb-16 pt-4 sm:px-6 sm:pb-24 sm:pt-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-6 sm:mb-8 text-2xl sm:text-3xl font-bold text-white">Trending Now</h2>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e50914]"></div>
            </div>
          ) : popularMovies && popularMovies.length > 0 ? (
            <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {popularMovies.map((movie) => (
                <NewMovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-[#9ca3af]">No movies available</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#e50914]" />
              <span className="font-semibold text-white">Movie Recommendr</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-[#9ca3af]">
              <Link href="/discover" className="transition-colors hover:text-white">
                Discover
              </Link>
              <Link href="/recommendations" className="transition-colors hover:text-white">
                Recommendations
              </Link>
              <Link href="/chat" className="transition-colors hover:text-white">
                AI Chat
              </Link>
              <Link href="/watchlist" className="transition-colors hover:text-white">
                Watchlist
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
