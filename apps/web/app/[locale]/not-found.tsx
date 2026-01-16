'use client';

import {useTranslations} from 'next-intl';
import {Link} from '@/navigation';

export default function NotFound() {
  const t = useTranslations('MovieDetails'); // Переиспользуем ключи "не найдено"

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 text-center">
      <div>
        <div className="text-6xl mb-4">😢</div>
        <h1 className="text-3xl font-bold text-white mb-2">{t('notFound')}</h1>
        <p className="text-[#9ca3af] mb-8">{t('notFoundDesc')}</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#e50914] text-white rounded-lg hover:bg-[#e50914]/90 transition"
        >
          {t('browseMovies')}
        </Link>
      </div>
    </div>
  );
}
