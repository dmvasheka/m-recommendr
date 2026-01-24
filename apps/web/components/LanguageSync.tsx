'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useLanguagePreference } from '@/lib/api/hooks'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/navigation'

/**
 * LanguageSync component
 * Automatically syncs user's preferred language from database on login
 * and redirects to the correct locale if needed
 */
export function LanguageSync() {
  const { user } = useAuth()
  const currentLocale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const hasChecked = useRef(false)

  // Fetch user's preferred language from database
  const { data: preferredLanguage, isLoading } = useLanguagePreference(user?.id || '')

  useEffect(() => {
    // Only run once per session to avoid redirect loops
    if (hasChecked.current || !user || isLoading) {
      return
    }

    // Check if there was a recent manual language change
    if (typeof window !== 'undefined') {
      const manualChange = localStorage.getItem('manualLanguageChange')
      if (manualChange) {
        try {
          const { timestamp, language } = JSON.parse(manualChange)
          const elapsed = Date.now() - timestamp

          // If manual change was within last 10 seconds, respect it
          if (elapsed < 10000) {
            console.log(`⏱️  LanguageSync: Skipping auto-sync due to recent manual change (${Math.round(elapsed/1000)}s ago)`)
            hasChecked.current = true

            // Clean up if we're on the correct language
            if (language === currentLocale) {
              localStorage.removeItem('manualLanguageChange')
            }
            return
          } else {
            // Clean up expired entry
            localStorage.removeItem('manualLanguageChange')
          }
        } catch (e) {
          // Invalid data, clean up
          localStorage.removeItem('manualLanguageChange')
        }
      }
    }

    // If user has a preferred language and it's different from current locale
    if (preferredLanguage && preferredLanguage !== currentLocale) {
      hasChecked.current = true

      // Redirect to user's preferred language
      console.log(`🔄 LanguageSync: Syncing language ${currentLocale} -> ${preferredLanguage}`)
      router.replace(pathname, { locale: preferredLanguage })
    } else if (preferredLanguage) {
      // Language matches, mark as checked
      hasChecked.current = true
      console.log(`✅ LanguageSync: Language already matches (${currentLocale})`)
    }
  }, [user, preferredLanguage, currentLocale, isLoading, router, pathname])

  // Reset check when user logs out
  useEffect(() => {
    if (!user) {
      hasChecked.current = false
    }
  }, [user])

  // This component doesn't render anything
  return null
}
