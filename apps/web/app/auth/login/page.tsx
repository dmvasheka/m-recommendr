'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { signIn } = useAuth()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await signIn(email, password)
            router.push('/discover')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign in')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <Sparkles className="h-8 w-8 text-[#e50914]" />
                    <span className="text-2xl font-semibold text-white">Movie Recommendr</span>
                </Link>

                {/* Card */}
                <div className="bg-[#1a1a2e]/40 border border-white/10 backdrop-blur-sm rounded-xl p-8">
                    <h1 className="text-3xl font-bold text-white mb-6 text-center">
                        Welcome Back
                    </h1>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-[#1a1a2e]/60 border border-white/10 text-white placeholder:text-[#9ca3af] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e50914] focus:border-transparent"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-[#1a1a2e]/60 border border-white/10 text-white placeholder:text-[#9ca3af] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e50914] focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#e50914] hover:bg-[#e50914]/90 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-[#9ca3af]">
                        Don't have an account?{' '}
                        <Link href="/auth/signup" className="text-[#e50914] font-medium hover:text-[#e50914]/90 transition-colors">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
