import Link from 'next/link'
import { Navbar } from '@/components/Navbar'

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <Navbar />

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="pt-20 pb-16 text-center lg:pt-32">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                        Discover Your Next
                        <span className="block text-indigo-600">Favorite Movie</span>
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
                        AI-powered movie recommendations tailored to your taste.
                        Search with natural language, build your watchlist, and get
                        personalized suggestions powered by advanced machine learning.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <Link
                            href="/discover"
                            className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition"
                        >
                            Start Discovering
                        </Link>
                        <Link
                            href="/auth/signup"
                            className="rounded-lg px-6 py-3 text-base font-semibold text-gray-900 hover:bg-gray-100 transition"
                        >
                            Sign up free <span aria-hidden="true">→</span>
                        </Link>
                    </div>
                </div>

                {/* Features Section */}
                <div className="py-24 sm:py-32">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                                Everything you need to find great movies
                            </h2>
                            <p className="mt-6 text-lg leading-8 text-gray-600">
                                Powered by OpenAI embeddings and vector similarity search
                            </p>
                        </div>

                        <div className="mx-auto mt-16 max-w-7xl sm:mt-20 lg:mt-24">
                            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
                                {/* Feature 1: AI Recommendations */}
                                <div className="relative pl-16">
                                    <dt className="text-base font-semibold leading-7 text-gray-900">
                                        <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                            <span className="text-2xl">🤖</span>
                                        </div>
                                        AI-Powered Recommendations
                                    </dt>
                                    <dd className="mt-2 text-base leading-7 text-gray-600">
                                        Get personalized movie suggestions based on your viewing history
                                        and preferences. Our AI learns what you love and finds similar gems.
                                    </dd>
                                </div>

                                {/* Feature 2: Semantic Search */}
                                <div className="relative pl-16">
                                    <dt className="text-base font-semibold leading-7 text-gray-900">
                                        <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                            <span className="text-2xl">🔍</span>
                                        </div>
                                        Semantic Search
                                    </dt>
                                    <dd className="mt-2 text-base leading-7 text-gray-600">
                                        Search with natural language. Type "space exploration with emotional depth"
                                        and find movies that match the vibe, not just keywords.
                                    </dd>
                                </div>

                                {/* Feature 3: Smart Watchlist */}
                                <div className="relative pl-16">
                                    <dt className="text-base font-semibold leading-7 text-gray-900">
                                        <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                            <span className="text-2xl">📋</span>
                                        </div>
                                        Smart Watchlist
                                    </dt>
                                    <dd className="mt-2 text-base leading-7 text-gray-600">
                                        Save movies to watch later and rate what you've seen.
                                        Your ratings automatically improve your personalized recommendations.
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="relative isolate px-6 py-24 sm:py-32 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                            Ready to discover amazing movies?
                        </h2>
                        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
                            Join thousands of movie lovers finding their next favorite film with AI-powered recommendations.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Link
                                href="/auth/signup"
                                className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
                            >
                                Get started for free
                            </Link>
                            <Link
                                href="/discover"
                                className="text-base font-semibold leading-7 text-gray-900 hover:text-indigo-600 transition"
                            >
                                Explore movies <span aria-hidden="true">→</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-50 border-t border-gray-200">
                <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-base text-gray-400">
                        &copy; 2024 Movie Recommendr. Powered by OpenAI & TMDB.
                    </p>
                </div>
            </footer>
        </div>
    )
}