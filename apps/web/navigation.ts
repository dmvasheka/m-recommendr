import {routing} from './i18n/routing';
import {createNavigation} from 'next-intl/navigation';

export const locales = routing.locales;
export const localePrefix = routing.localePrefix;

export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);