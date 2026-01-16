import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';
 
export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  // Ensure we always have a valid string locale
  const validLocale = (locale && routing.locales.includes(locale as any)
    ? locale
    : routing.defaultLocale) as string;

  // Мы используем динамический импорт.
  // Важно: в режиме dev Next.js может кэшировать пустые модули.
  const messages = (await import(`../messages/${validLocale}.json`)).default;

  return {
    locale: validLocale,
    messages
  };
});
