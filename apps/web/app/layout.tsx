import { ReactNode } from 'react';

// Это корневой лейаут. В Next.js 14 он обязан содержать теги html и body,
// чтобы предотвратить ошибку "missing required error components".
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}