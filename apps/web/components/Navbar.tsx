'use client'

import { useAuth } from '@/lib/auth/AuthProvider'
import { Link, useRouter, usePathname } from '@/navigation'
import { useTranslations, useLocale } from 'next-intl'

export function Navbar() {
    const { user, signOut } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const locale = useLocale()
    const t = useTranslations('Navigation')

    const handleSignOut = async () => {
        await signOut()
        router.push('/')
    }

    const toggleLocale = () => {
        const nextLocale = locale === 'en' ? 'ru' : 'en'
        router.replace(pathname, { locale: nextLocale })
    }

    return (
        <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link href="/" className="flex items-center">
                            <span className="text-2xl font-bold text-indigo-600">🎬 MovieRecommendr</span>
                        </Link>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link
                                href="/discover"
                                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-indigo-600"
                            >
                                {t('discover')}
                            </Link>
                            {user && (
                                <>
                                    <Link
                                        href="/watchlist"
                                        className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-indigo-600"
                                    >
                                        {t('watchlist')}
                                    </Link>
                                    <Link
                                        href="/recommendations"
                                        className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-indigo-600"
                                    >
                                        {t('recommendations')}
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleLocale}
                            className="px-2 py-1 text-xs font-bold border border-gray-300 rounded hover:bg-gray-100 uppercase"
                        >
                            {locale === 'en' ? 'ru' : 'en'}
                        </button>

                        {user ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-700 hidden md:inline">{user.email}</span>
                                <button
                                    onClick={handleSignOut}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                                >
                                    {t('signOut')}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link
                                    href="/auth/login"
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                                >
                                    {t('signIn')}
                                </Link>
                                <Link
                                    href="/auth/signup"
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                                >
                                    {t('signUp')}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}