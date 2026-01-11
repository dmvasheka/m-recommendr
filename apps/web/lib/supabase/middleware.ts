import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest, response: NextResponse) {
    // Используем уже существующий response от intlMiddleware
    let supabaseResponse = response;

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    // Обновляем response с новыми куками Supabase
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protected routes check
    const protectedRoutes = ['/discover', '/watchlist', '/recommendations', '/profile']
    const isProtectedRoute =
        protectedRoutes.some(route =>
            request.nextUrl.pathname.match(new RegExp(`^/([a-z]{2})?${route}`))
        )

    if (isProtectedRoute && !user) {
        const url = request.nextUrl.clone()
        const localeMatch = request.nextUrl.pathname.match(/^\/([a-z]{2})\//);
        const locale = localeMatch ? localeMatch[1] : 'en';
        
        url.pathname = `/${locale}/auth/login`
        url.searchParams.set('redirectedFrom', request.nextUrl.pathname)
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
