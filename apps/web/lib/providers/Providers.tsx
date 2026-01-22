'use client'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { ReactQueryProvider } from './ReactQueryProvider'
import { LanguageSync } from '@/components/LanguageSync'

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ReactQueryProvider>
            <AuthProvider>
                <LanguageSync />
                {children}
            </AuthProvider>
        </ReactQueryProvider>
    )
}
