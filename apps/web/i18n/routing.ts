import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  // Список поддерживаемых локалей
  locales: ['en', 'ru'],

  // Локаль по умолчанию
  defaultLocale: 'en',

  // Всегда показывать префикс локали в URL (например, /ru/...)
  localePrefix: 'always'
});

// Экспортируем обертки над стандартными компонентами Next.js,
// которые автоматически учитывают текущую локаль
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
