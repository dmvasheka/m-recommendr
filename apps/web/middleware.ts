import createMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
    // 1. Сначала запускаем локализацию. 
    // Она вернет NextResponse с нужными куками или редиректом.
    const response = intlMiddleware(request);

    // 2. Затем передаем этот response в Supabase, 
    // чтобы он обновил сессию (тоже через куки).
    // Мы должны изменить updateSession, чтобы он принимал и возвращал response.
    return await updateSession(request, response);
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
