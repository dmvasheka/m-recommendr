'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Логируем ошибку в консоль сервера/браузера
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold text-white mb-4">Something went wrong!</h2>
      <p className="text-gray-400 mb-8 max-w-md">
        {error.message || 'An unexpected error occurred in the application.'}
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-[#e50914] text-white rounded-lg hover:bg-[#e50914]/90 transition"
      >
        Try again
      </button>
    </div>
  );
}
