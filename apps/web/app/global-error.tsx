'use client';

import NextError from 'next/error';

// Этот компонент обязателен для обработки ошибок на самом верхнем уровне.
// В отличие от обычных страниц, он должен содержать теги html и body.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="en">
      <body>
        <NextError statusCode={500} title="A global error occurred" />
      </body>
    </html>
  );
}
