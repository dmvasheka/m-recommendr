import {createSharedPathnamesNavigation} from 'next-intl/navigation';
 
export const locales = ['en', 'ru'] as const;
export const localePrefix = 'always'; // Постоянно показывать префикс в URL
 
export const {Link, redirect, usePathname, useRouter} =
  createSharedPathnamesNavigation({locales, localePrefix});
