import React, { useState, useEffect, useRef, useCallback } from 'react'
import { apiService, OrderMessage } from '../services/api'

interface OrderChatProps {
  orderId: string
  currentUserId: string
  compact?: boolean
}

export const OrderChat: React.FC<OrderChatProps> = ({ orderId, currentUserId, compact = false }) => {
  const [messages, setMessages] = useState<OrderMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const data = await apiService.getOrderMessages(orderId)
      setMessages(data)
      setError(null)
    } catch {
      if (!silent) setError('Не удалось загрузить сообщения')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(() => fetchMessages(true), 4000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return

    try {
      setSending(true)
      const message = await apiService.sendOrderMessage(orderId, trimmed)
      setMessages(prev => [...prev, message])
      setText('')
      setError(null)
    } catch {
      setError('Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getSenderName = (msg: OrderMessage) => {
    const { first_name, last_name } = msg.sender_info
    return `${first_name || ''} ${last_name || ''}`.trim() || msg.sender_info.phone
  }

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
          Админ
        </span>
      )
    }
    return (
      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
        Трейдер
      </span>
    )
  }

  return (
    <div className={`flex flex-col bg-gray-900/60 border border-gray-700/80 rounded-xl overflow-hidden ${compact ? 'h-80' : 'h-96'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/80 bg-gray-800/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-semibold text-white">Чат по сделке</span>
        </div>
        <span className="text-xs text-gray-500 font-mono">#{orderId.slice(0, 8)}</span>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin"
      >
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Сообщений пока нет</p>
            <p className="text-xs text-gray-500 mt-1">Напишите первым — админ и трейдер видят чат</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isOwn = msg.sender === currentUserId
          const showAvatar = index === 0 || messages[index - 1].sender !== msg.sender

          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-1' : 'mt-0.5'}`}
            >
              <div className={`max-w-[85%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                {showAvatar && !isOwn && (
                  <div className="flex items-center gap-2 mb-1 ml-1">
                    <span className="text-xs font-medium text-gray-300">{getSenderName(msg)}</span>
                    {getRoleBadge(msg.sender_info.role)}
                  </div>
                )}
                {showAvatar && isOwn && (
                  <div className="flex items-center gap-2 mb-1 mr-1">
                    {getRoleBadge(msg.sender_info.role)}
                    <span className="text-xs font-medium text-gray-400">Вы</span>
                  </div>
                )}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-lg ${
                    isOwn
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md'
                      : 'bg-gray-800 text-gray-100 border border-gray-700/60 rounded-bl-md'
                  }`}
                >
                  {msg.text}
                </div>
                <span className={`text-[10px] text-gray-500 mt-1 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-gray-700/80 bg-gray-800/60">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e)
                }
              }}
              placeholder="Напишите сообщение..."
              rows={1}
              className="w-full px-4 py-2.5 bg-gray-900/80 border border-gray-600/60 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none max-h-24"
            />
          </div>
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex-shrink-0 p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 disabled:shadow-none"
            title="Отправить"
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 ml-1">Enter — отправить, Shift+Enter — новая строка</p>
      </form>
    </div>
  )
}
