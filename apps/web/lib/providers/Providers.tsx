'use client'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { ReactQueryProvider } from './ReactQueryProvider'
import { LanguageSync } from '@/components/LanguageSync'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ReactQueryProvider>
            <AuthProvider>
                {/* <LanguageSync /> */}
                <Toaster
                    position="bottom-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#1a1a2e',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        },
                        success: {
                            iconTheme: {
                                primary: '#10b981',
                                secondary: '#fff',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#fff',
                            },
                        },
                    }}
                />
                {children}
            </AuthProvider>
        </ReactQueryProvider>
    )
}
