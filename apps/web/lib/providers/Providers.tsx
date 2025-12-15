'use client'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { ReactQueryProvider } from './ReactQueryProvider'

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ReactQueryProvider>
            <AuthProvider>
                {children}
            </AuthProvider>
        </ReactQueryProvider>
    )
}
