'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useSendChatMessage } from '@/lib/api/hooks'
import { useRouter } from '@/navigation'
import { useTranslations, useLocale } from 'next-intl'

interface Message {
    role: 'user' | 'assistant'
    content: string
    timestamp: string
}

export default function ChatPage() {
    const router = useRouter()
    const { user } = useAuth()
    const locale = useLocale()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const t = useTranslations('Chat')

    const sendMessage = useSendChatMessage()

    // Redirect if not logged in
    useEffect(() => {
        if (!user) {
            router.push('/auth/login')
        }
    }, [user, router])

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || !user || isLoading) return

        const userMessage: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date().toISOString(),
        }

        // Add user message immediately
        setMessages((prev) => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const response = await sendMessage.mutateAsync({
                userId: user.id,
                message: userMessage.content,
                includeHistory: false,
            })

            // Add AI response
            const aiMessage: Message = {
                role: 'assistant',
                content: response.aiResponse,
                timestamp: response.timestamp,
            }
            setMessages((prev) => [...prev, aiMessage])
        } catch (error) {
            console.error('Chat error:', error)
            const errorMessage: Message = {
                role: 'assistant',
                content: t('error'),
                timestamp: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const formatMessageContent = (content: string) => {
        // Simple markdown-like formatting for bold titles
        return content.split('\n').map((line, i) => {
            // Bold text between **
            const boldFormatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            return (
                <p
                    key={i}
                    className="mb-2 last:mb-0"
                    dangerouslySetInnerHTML={{ __html: boldFormatted }}
                />
            )
        })
    }

    if (!user) {
        return null // Will redirect
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] flex flex-col">
            {/* Header */}
            <div className="bg-[#0a0a0f]/80 border-b border-white/10 backdrop-blur-xl px-4 py-4 fixed top-0 left-0 right-0 z-10">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                        <p className="text-sm text-[#9ca3af] mt-1">
                            {t('subtitle')}
                        </p>
                    </div>
                    <button
                        onClick={() => router.replace('/chat', { locale: locale === 'en' ? 'ru' : 'en' })}
                        className="px-2 py-1 text-xs font-bold border border-white/20 rounded text-white hover:bg-white/10 uppercase"
                    >
                        {locale === 'en' ? 'ru' : 'en'}
                    </button>
                </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto px-4 py-6 mt-24">
                <div className="max-w-4xl mx-auto space-y-6">
                    {messages.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🎬</div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                {t('startTitle')}
                            </h2>
                            <p className="text-[#9ca3af] max-w-md mx-auto">
                                {t('startDesc')}
                            </p>
                            <div className="mt-6 space-y-2">
                                <p className="text-sm font-medium text-white">{t('tryAsking')}</p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    <button
                                        onClick={() =>
                                            setInput(t('suggestions.uplifting'))
                                        }
                                        className="text-sm px-3 py-1.5 bg-[#e50914]/20 text-[#e50914] border border-[#e50914]/30 rounded-full hover:bg-[#e50914]/30 transition-colors"
                                    >
                                        {t('suggestions.uplifting')}
                                    </button>
                                    <button
                                        onClick={() =>
                                            setInput(t('suggestions.sciFi'))
                                        }
                                        className="text-sm px-3 py-1.5 bg-[#e50914]/20 text-[#e50914] border border-[#e50914]/30 rounded-full hover:bg-[#e50914]/30 transition-colors"
                                    >
                                        {t('suggestions.sciFi')}
                                    </button>
                                    <button
                                        onClick={() =>
                                            setInput(t('suggestions.thrillers'))
                                        }
                                        className="text-sm px-3 py-1.5 bg-[#e50914]/20 text-[#e50914] border border-[#e50914]/30 rounded-full hover:bg-[#e50914]/30 transition-colors"
                                    >
                                        {t('suggestions.thrillers')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-3xl rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-[#e50914] text-white' : 'bg-[#1a1a2e]/40 border border-white/10 backdrop-blur-sm text-white'}`}
                            >
                                {message.role === 'assistant' ? (
                                    <div className="prose prose-sm max-w-none prose-invert text-white">
                                        {formatMessageContent(message.content)}
                                    </div>
                                ) : (
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                )}
                                <div
                                    className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-[#9ca3af]'}`}
                                >
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-3xl rounded-2xl px-4 py-3 bg-[#1a1a2e]/40 border border-white/10 backdrop-blur-sm">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-[#9ca3af] rounded-full animate-bounce" />
                                    <div
                                        className="w-2 h-2 bg-[#9ca3af] rounded-full animate-bounce"
                                        style={{ animationDelay: '0.2s' }}
                                    />
                                    <div
                                        className="w-2 h-2 bg-[#9ca3af] rounded-full animate-bounce"
                                        style={{ animationDelay: '0.4s' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Form */}
            <div className="bg-[#0a0a0f]/80 border-t border-white/10 backdrop-blur-xl px-4 py-4">
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={t('placeholder')}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 bg-[#1a1a2e]/40 border border-white/10 text-white placeholder:text-[#9ca3af] rounded-full focus:outline-none focus:ring-2 focus:ring-[#e50914] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="px-6 py-3 bg-[#e50914] text-white rounded-full font-medium hover:bg-[#e50914]/90 disabled:bg-[#9ca3af]/20 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? t('thinking') : t('send')}
                        </button>
                    </form>
                    <p className="text-xs text-[#9ca3af] mt-2 text-center">
                        {t('footer')}
                    </p>
                </div>
            </div>
        </div>
    )
}