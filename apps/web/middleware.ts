import createMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { locales, localePrefix } from './navigation';

// 1. Создаем middleware для локализации
const intlMiddleware = createMiddleware({
    locales,
    localePrefix,
    defaultLocale: 'en'
});

export default async function middleware(request: NextRequest) {
    // 2. Сначала запускаем локализацию
    // Это обработает редиректы типа /discover -> /en/discover
    const response = intlMiddleware(request);

    // 3. Затем обновляем сессию Supabase
    // Мы передаем запрос, чтобы проверить авторизацию на уже локализованных путях
    return await updateSession(request);
}

export const config = {
    matcher: [
        // Пропускаем статику и API
        '/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

