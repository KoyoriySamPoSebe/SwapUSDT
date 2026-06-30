import React, { useState, useEffect, useRef, useCallback } from 'react'
import { apiService, SupportMessage, SupportThread, User } from '../services/api'

interface SupportWidgetProps {
  user: User
}

export const SupportWidget: React.FC<SupportWidgetProps> = ({ user }) => {
  const isAdmin = user.role === 'admin'
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [threads, setThreads] = useState<SupportThread[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [adminView, setAdminView] = useState<'inbox' | 'chat'>('inbox')
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null)
  const [telegramLinked, setTelegramLinked] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiService.getSupportTelegramInfo().then((info) => {
      if (info.bot_url) setTelegramUrl(info.bot_url)
      setTelegramLinked(info.is_linked)
    }).catch(() => {})
  }, [])

  const fetchUnread = useCallback(async () => {
    try {
      const data = await apiService.getSupportUnreadCount()
      setUnreadCount(data.unread_count)
    } catch {
      /* ignore */
    }
  }, [])

  const fetchUserMessages = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const data = await apiService.getSupportMessages()
      setMessages(data)
      await fetchUnread()
    } finally {
      if (!silent) setLoading(false)
    }
  }, [fetchUnread])

  const fetchThreads = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiService.getSupportThreads()
      const unique = Array.from(new Map(data.map((t) => [t.user_info.id, t])).values())
      unique.sort((a, b) => {
        const aUnread = a.unread_count > 0 ? 0 : 1
        const bUnread = b.unread_count > 0 ? 0 : 1
        if (aUnread !== bUnread) return aUnread - bUnread
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      })
      setThreads(unique)
      await fetchUnread()
    } finally {
      setLoading(false)
    }
  }, [fetchUnread])

  const fetchAdminThread = useCallback(async (userId: string, silent = false) => {
    try {
      if (!silent) setLoading(true)
      const data = await apiService.getSupportThreadMessages(userId)
      setMessages(data)
      await fetchUnread()
    } finally {
      if (!silent) setLoading(false)
    }
  }, [fetchUnread])

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 15000)
    return () => clearInterval(interval)
  }, [fetchUnread])

  useEffect(() => {
    if (!isOpen) return

    if (isAdmin && adminView === 'inbox' && !selectedUserId) {
      fetchThreads()
      return
    }

    if (isAdmin && selectedUserId) {
      fetchAdminThread(selectedUserId)
      const interval = setInterval(() => fetchAdminThread(selectedUserId, true), 5000)
      return () => clearInterval(interval)
    }

    if (!isAdmin) {
      fetchUserMessages()
      const interval = setInterval(() => fetchUserMessages(true), 5000)
      return () => clearInterval(interval)
    }
  }, [isOpen, isAdmin, adminView, selectedUserId, fetchThreads, fetchAdminThread, fetchUserMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleOpen = () => {
    setIsOpen(true)
    if (isAdmin) {
      setAdminView('inbox')
      setSelectedUserId(null)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setSelectedUserId(null)
    setMessages([])
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return

    try {
      setSending(true)
      if (isAdmin && selectedUserId) {
        await apiService.replySupportMessage(selectedUserId, trimmed)
        await fetchAdminThread(selectedUserId, true)
      } else {
        await apiService.sendSupportMessage(trimmed)
        await fetchUserMessages(true)
      }
      setText('')
      fetchUnread()
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })

  const unreadThreadsCount = threads.filter((t) => t.unread_count > 0).length

  const openThread = (userId: string) => {
    setSelectedUserId(userId)
    setAdminView('chat')
    setMessages([])
  }

  const isFromCurrentUser = (msg: SupportMessage) => msg.sender === user.id

  const isSupportMessage = (msg: SupportMessage) => msg.sender_info.role === 'admin'

  const alignRight = (msg: SupportMessage) => isFromCurrentUser(msg)

  const SupportAvatar = () => (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-purple-600/30 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10">
      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    </div>
  )

  const UserAvatar = ({ name }: { name: string }) => (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-300">
      {name.charAt(0).toUpperCase()}
    </div>
  )

  return (
    <>
      {/* Floating bubble */}
      {!isOpen && (
        <div
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-3"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className={`transition-all duration-300 ease-out overflow-hidden ${
              isHovered ? 'max-w-[200px] opacity-100 translate-x-0' : 'max-w-0 opacity-0 translate-x-4'
            }`}
          >
            <div className="bg-gray-800 border border-gray-600/60 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-xl whitespace-nowrap">
              Есть вопрос?
            </div>
          </div>

          <button
            onClick={handleOpen}
            className="relative group w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 flex items-center justify-center"
            aria-label="Открыть поддержку"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="20" viewBox="0 0 27 20" className="text-white">
              <g fill="currentColor" fillRule="nonzero">
                <path d="M26.56 1.597l-10.364 9.788a3.916 3.916 0 0 1-2.696 1.053 3.915 3.915 0 0 1-2.696-1.053L.44 1.597A2.97 2.97 0 0 0 0 3.15v13.5c0 1.65 1.35 3 3 3h21c1.65 0 3-1.35 3-3V3.15a2.97 2.97 0 0 0-.44-1.553z" />
                <path d="M15.166 10.294L25.486.55A2.968 2.968 0 0 0 24 .15H3c-.54 0-1.046.146-1.485.398l10.32 9.746c.902.854 2.428.853 3.33 0z" opacity="0.85" />
              </g>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center bg-red-500 text-white text-[11px] font-bold rounded-full border-2 border-gray-900 animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[100] w-[380px] max-w-[calc(100vw-2rem)] animate-fadeIn">
          <div className="bg-gray-800 border border-gray-700/80 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col h-[560px] max-h-[calc(100vh-3rem)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-emerald-900/30 via-gray-800 to-purple-900/20 border-b border-emerald-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/25 to-purple-600/25 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    Поддержка SwapUSDT
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-emerald-400/80">Онлайн · ответим за несколько минут</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Telegram CTA */}
            <div className="px-4 py-3 border-b border-gray-700/60 bg-gray-900/40">
              {telegramUrl ? (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#2AABEE] to-[#229ED9] hover:from-[#3bb8f5] hover:to-[#2AABEE] text-white font-medium text-sm shadow-lg shadow-[#2AABEE]/20 hover:shadow-[#2AABEE]/40 transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    Написать в Telegram
                    {telegramLinked && (
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">привязан</span>
                    )}
                  </div>
                  <div className="text-xs text-white/80">
                    {telegramLinked
                      ? 'Отдельный чат — не дублируется на сайт'
                      : 'Start — личный чат с поддержкой в TG'}
                  </div>
                </div>
                <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              ) : (
                <div className="text-xs text-gray-500 text-center py-2">Telegram-бот настраивается…</div>
              )}
            </div>

            {/* Admin inbox header */}
            {isAdmin && (
              <div className="flex border-b border-gray-700/60">
                <button
                  onClick={() => { setAdminView('inbox'); setSelectedUserId(null); setMessages([]) }}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    adminView === 'inbox' && !selectedUserId
                      ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Чаты
                  {unreadThreadsCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                      {unreadThreadsCount}
                    </span>
                  )}
                </button>
                {selectedUserId && (
                  <button
                    onClick={() => setAdminView('chat')}
                    className="flex-1 py-2.5 text-xs font-medium text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                  >
                    Диалог
                  </button>
                )}
              </div>
            )}

            {/* Admin back + thread list */}
            {isAdmin && adminView === 'inbox' && !selectedUserId && (
              <div className="flex-1 overflow-y-auto">
                {loading && threads.length === 0 && (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                  </div>
                )}
                {!loading && threads.length === 0 && (
                  <div className="text-center py-12 px-4">
                    <p className="text-sm text-gray-400">Чатов пока нет</p>
                  </div>
                )}
                {threads.map((thread) => (
                  <button
                    key={thread.user_info.id}
                    onClick={() => openThread(thread.user_info.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-700/40 transition-colors ${
                      thread.unread_count > 0
                        ? 'bg-blue-500/10 hover:bg-blue-500/15 border-l-2 border-l-blue-500'
                        : 'hover:bg-gray-700/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${thread.unread_count > 0 ? 'text-white' : 'text-gray-200'}`}>
                        {thread.unread_count > 0 && (
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2 align-middle" />
                        )}
                        {thread.user_info.first_name} {thread.user_info.last_name}
                      </span>
                      {thread.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {thread.unread_count}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate ${thread.unread_count > 0 ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>
                      {thread.last_message}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">{formatTime(thread.last_message_at)}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Chat area */}
            {(!isAdmin || selectedUserId) && (
              <>
                {isAdmin && selectedUserId && (
                  <div className="px-4 py-2 border-b border-gray-700/40 flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedUserId(null); setAdminView('inbox'); setMessages([]) }}
                      className="text-gray-400 hover:text-white p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-xs text-gray-300">Ответ пользователю</span>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0">
                  {loading && messages.length === 0 && (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-500" />
                    </div>
                  )}
                  {!loading && messages.length === 0 && (
                    <div className="text-center py-8 px-4">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-300 font-medium">Напишите нам</p>
                      <p className="text-xs text-gray-500 mt-1">Telegram — отдельный канал, см. кнопку выше</p>
                    </div>
                  )}
                  {messages.map((msg) => {
                    const fromSupport = isSupportMessage(msg)
                    const right = alignRight(msg)
                    const senderName = `${msg.sender_info.first_name || ''} ${msg.sender_info.last_name || ''}`.trim() || 'Вы'

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${right ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {fromSupport ? <SupportAvatar /> : (
                          <UserAvatar name={isAdmin && selectedUserId ? senderName : user.first_name || 'U'} />
                        )}

                        <div className={`flex flex-col max-w-[78%] ${right ? 'items-end' : 'items-start'}`}>
                          <div className={`flex items-center gap-1.5 mb-1 ${right ? 'flex-row-reverse' : 'flex-row'}`}>
                            {fromSupport ? (
                              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                Поддержка SwapUSDT
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-gray-400">
                                {right ? 'Вы' : senderName}
                              </span>
                            )}
                          </div>

                          <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md ${
                            fromSupport
                              ? 'bg-gradient-to-br from-gray-800 to-gray-850 text-gray-100 border border-emerald-500/35 rounded-bl-sm shadow-emerald-500/5'
                              : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm shadow-blue-500/20'
                          }`}>
                            {msg.text}
                          </div>

                          <span className={`text-[10px] text-gray-600 mt-1 ${right ? 'mr-1' : 'ml-1'}`}>
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-3 border-t border-gray-700/80 bg-gray-900/50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Ваш вопрос..."
                      className="flex-1 px-3 py-2.5 bg-gray-800 border border-gray-600/60 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    <button
                      type="submit"
                      disabled={!text.trim() || sending}
                      className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-xl transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Admin on inbox without selected - hide input (handled above) */}
          </div>
        </div>
      )}
    </>
  )
}
