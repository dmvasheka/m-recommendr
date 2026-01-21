import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';
 
export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  let validLocale: string = locale ?? routing.defaultLocale;
  if (!routing.locales.includes(validLocale as any)) {
    validLocale = routing.defaultLocale;
  }

  // Мы используем динамический импорт.
  // Важно: в режиме dev Next.js может кэшировать пустые модули.
  const messages = (await import(`../messages/${validLocale}.json`)).default;

  return {
    locale: validLocale,
    messages
  };
});
