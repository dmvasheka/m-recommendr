import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'image.tmdb.org',
                pathname: '/t/p/**',
            },
        ],
    },

    // Security Headers
    async headers() {
        return [
            {
                // Apply headers to all routes
                source: '/:path*',
                headers: [
                    // Content Security Policy (CSP)
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline for dev
                            "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
                            "img-src 'self' https: data: blob:",
                            "font-src 'self' data:",
                            "connect-src 'self' https://ezsevdbawfylziuqhbnd.supabase.co https://api-production-9141.up.railway.app http://localhost:3001 ws://localhost:*", // API connections
                            "frame-ancestors 'self'",
                            "base-uri 'self'",
                            "form-action 'self'",
                        ].join('; '),
                    },
                    // Prevent browsers from incorrectly detecting non-scripts as scripts
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    // Prevent clickjacking attacks
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                    // Enable browser XSS protection (legacy but still useful)
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    // Control how much referrer information is shared
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    // Restrict browser features and APIs
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
                    },
                    // Force HTTPS connections (Strict-Transport-Security)
                    // Note: Only enable in production with HTTPS
                    ...(process.env.NODE_ENV === 'production' ? [{
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    }] : []),
                ],
            },
        ];
    },
};

export default withNextIntl(nextConfig);
