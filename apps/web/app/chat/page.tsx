'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useSendChatMessage } from '@/lib/api/hooks'
import { useRouter } from 'next/navigation'

interface Message {
    role: 'user' | 'assistant'
    content: string
    timestamp: string
}

export default function ChatPage() {
    const router = useRouter()
    const { user } = useAuth()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

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
                content: 'Sorry, I encountered an error. Please try again.',
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
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-bold text-gray-900">Movie Chat</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Ask me anything about movies and get personalized recommendations
                    </p>
                </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {messages.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🎬</div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                Start a conversation
                            </h2>
                            <p className="text-gray-600 max-w-md mx-auto">
                                Ask me for movie recommendations, or tell me what you're in the mood
                                to watch. I'll use AI to find the perfect movies for you!
                            </p>
                            <div className="mt-6 space-y-2">
                                <p className="text-sm font-medium text-gray-700">Try asking:</p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    <button
                                        onClick={() =>
                                            setInput('I want to watch something uplifting')
                                        }
                                        className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                                    >
                                        Something uplifting
                                    </button>
                                    <button
                                        onClick={() =>
                                            setInput('Recommend me a sci-fi movie with space exploration')
                                        }
                                        className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                                    >
                                        Sci-fi with space
                                    </button>
                                    <button
                                        onClick={() =>
                                            setInput('What are some good thrillers?')
                                        }
                                        className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                                    >
                                        Good thrillers
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                        >
                            <div
                                className={`max-w-3xl rounded-2xl px-4 py-3 ${
                                    message.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white border border-gray-200 text-gray-900'
                                }`}
                            >
                                {message.role === 'assistant' ? (
                                    <div className="prose prose-sm max-w-none">
                                        {formatMessageContent(message.content)}
                                    </div>
                                ) : (
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                )}
                                <div
                                    className={`text-xs mt-2 ${
                                        message.role === 'user'
                                            ? 'text-blue-100'
                                            : 'text-gray-500'
                                    }`}
                                >
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-3xl rounded-2xl px-4 py-3 bg-white border border-gray-200">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                    <div
                                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                        style={{ animationDelay: '0.2s' }}
                                    />
                                    <div
                                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
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
            <div className="bg-white border-t border-gray-200 px-4 py-4">
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me about movies..."
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Thinking...' : 'Send'}
                        </button>
                    </form>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                        Powered by AI • Ask about genres, moods, actors, or specific movies
                    </p>
                </div>
            </div>
        </div>
    )
}
