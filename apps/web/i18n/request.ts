import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';
 
export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
 
  // Мы используем динамический импорт. 
  // Важно: в режиме dev Next.js может кэшировать пустые модули.
  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages
  };
});
