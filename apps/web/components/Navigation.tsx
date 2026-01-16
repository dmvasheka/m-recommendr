'use client'

import { Sparkles, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth/AuthProvider"
import { useTranslations, useLocale } from 'next-intl'
import { Link, useRouter, usePathname } from '@/navigation'

export function Navigation() {
  const { user } = useAuth()
  const locale = useLocale()
  const t = useTranslations('Navigation')
  const router = useRouter()
  const pathname = usePathname()

  const toggleLocale = () => {
    const nextLocale = locale === 'en' ? 'ru' : 'en'
    router.replace(pathname, { locale: nextLocale })
  }

  return (
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
            {t('discover')}
          </Link>
          {user && (
            <Link
              href="/watchlist"
              className="flex items-center gap-2 text-sm sm:text-base text-[#9ca3af] hover:text-white transition-colors"
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">{t('watchlist')}</span>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
              onClick={toggleLocale}
              className="px-2 py-1 text-xs font-bold border border-white/20 rounded text-white hover:bg-white/10 uppercase mr-2"
          >
              {locale === 'en' ? 'ru' : 'en'}
          </button>

          {user ? (
            <>
              <Link
                href="/recommendations"
                className="hidden sm:block text-sm text-[#9ca3af] hover:text-white transition-colors"
              >
                {t('recommendations')}
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
                {t('signIn')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}