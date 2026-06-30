import React, { useState, useEffect, useCallback } from 'react'
import { Layout } from '../components/Layout'
import { TraderDetailSlider } from '../components/TraderDetailSlider'
import CreateTraderModal from '../components/CreateTraderModal'
import { apiService, Trader, PaymentMethod } from '../services/api'

export const TradersPageNew: React.FC = () => {
  const [traders, setTraders] = useState<Trader[]>([])
  const [allTraders, setAllTraders] = useState<Trader[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null)
  const [isSliderOpen, setIsSliderOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    fetchTraders()
  }, [])

  const fetchTraders = async () => {
    try {
      setLoading(true)
      const data = await apiService.getTraders()
      setTraders(data)
      setAllTraders(data)
    } catch (err) {
      setError('Ошибка при загрузке списка трейдеров')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length === 0) {
        setTraders(allTraders)
        setSearchLoading(false)
        return
      }

      if (query.length < 2) {
        setSearchLoading(false)
        return
      }

      try {
        const searchResults = await apiService.searchTraders(query)
        setTraders(searchResults)
      } catch (err) {
        console.error('Search error:', err)
        setError('Ошибка при поиске трейдеров')
      } finally {
        setSearchLoading(false)
      }
    }, 300),
    [allTraders]
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    setSearchLoading(true)
    debouncedSearch(query)
  }

  function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: ReturnType<typeof setTimeout>
    return ((...args: any[]) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }) as T
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(amount))
  }

  const handleTraderClick = (trader: Trader) => {
    setSelectedTrader(trader)
    setIsSliderOpen(true)
  }

  const handleCloseSlider = () => {
    setIsSliderOpen(false)
    setSelectedTrader(null)
  }

  const handlePaymentMethodAdded = (traderId: string, paymentMethod: PaymentMethod) => {
    setTraders(prev => prev.map(trader => 
      trader.id === traderId 
        ? { ...trader, payment_methods: [...trader.payment_methods, paymentMethod] }
        : trader
    ))
    
    if (selectedTrader && selectedTrader.id === traderId) {
      setSelectedTrader(prev => prev ? {
        ...prev,
        payment_methods: [...prev.payment_methods, paymentMethod]
      } : null)
    }
  }

  const handleTraderCreated = () => {
    fetchTraders()
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-6 w-full">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-4">
              <svg className="animate-spin h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-white text-lg">Загрузка трейдеров...</span>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 w-full">
          <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6 w-full">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title & Stats */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">Трейдеры</h1>
              <p className="text-gray-400 mb-6">Управление торговыми счетами</p>
              
              {/* Compact Stats */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-400">Всего:</span>
                  <span className="font-semibold text-white">{searchQuery ? traders.length : allTraders.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-400">Активных:</span>
                  <span className="font-semibold text-white">{traders.filter(trader => !trader.user_info.is_blocked).length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-400">Депозит:</span>
                  <span className="font-semibold text-white">{formatAmount(traders.reduce((sum, trader) => sum + parseFloat(trader.deposit_amount), 0).toString())}</span>
                </div>
              </div>
            </div>
            
            {/* Search */}
            <div className="flex-shrink-0 w-full lg:w-96">
              <div className="relative">
                <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-12 pr-12 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Поиск трейдеров..."
                />
                {searchLoading && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
                {searchQuery && !searchLoading && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setTraders(allTraders)
                    }}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Search Results Info */}
            {searchQuery && (
                <div className="mt-2 text-sm text-gray-400">
                  {searchQuery.length < 2 ? (
                    'Минимум 2 символа'
                  ) : (
                    `${traders.length} результат${traders.length === 1 ? '' : traders.length < 5 ? 'а' : 'ов'}`
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Traders Grid */}
        {traders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {traders.map((trader) => (
              <div
                key={trader.id}
                onClick={() => handleTraderClick(trader)}
                className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 hover:bg-gray-800/80 hover:border-gray-600/50 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-blue-500/10"
              >
                {/* Trader Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-sm">
                          {trader.user_info.first_name.charAt(0)}{trader.user_info.last_name.charAt(0)}
                        </span>
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-800 ${
                        trader.user_info.is_blocked ? 'bg-red-500' : 'bg-green-500'
                      }`}></div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                        {trader.user_info.first_name} {trader.user_info.last_name}
                      </h3>
                      {trader.user_info.patronymic_name && (
                        <p className="text-sm text-gray-400">{trader.user_info.patronymic_name}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Trader Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Депозит</span>
                    <span className="font-bold text-lg text-white">{formatAmount(trader.deposit_amount)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Телефон</span>
                    <span className="text-sm text-gray-300 font-mono">{trader.user_info.phone}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Способы оплаты</span>
                    {trader.payment_methods.length > 0 ? (
                      <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-xs font-medium">
                        {trader.payment_methods.length} метод{trader.payment_methods.length > 1 ? 'а' : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Не настроены</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                    <span className="text-xs text-gray-500">
                      {formatDate(trader.created_at)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                      trader.user_info.is_blocked 
                        ? 'bg-red-500/20 text-red-300' 
                        : 'bg-green-500/20 text-green-300'
                    }`}>
                      {trader.user_info.is_blocked ? 'Заблокирован' : 'Активен'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              {searchQuery ? 'Трейдеры не найдены' : 'Нет трейдеров'}
            </h3>
            <p className="text-gray-500">
              {searchQuery 
                ? `По запросу "${searchQuery}" ничего не найдено`
                : 'Пока нет зарегистрированных трейдеров'
              }
            </p>
          </div>
        )}

        {/* Trader Detail Slider */}
        <TraderDetailSlider
          trader={selectedTrader}
          isOpen={isSliderOpen}
          onClose={handleCloseSlider}
          onPaymentMethodAdded={handlePaymentMethodAdded}
        />

        {/* Floating Create Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 hover:scale-105"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>

        {/* Create Trader Modal */}
        <CreateTraderModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onTraderCreated={handleTraderCreated}
        />
      </div>
    </Layout>
  )
} 