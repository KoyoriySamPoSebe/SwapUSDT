import React, { useState, useEffect, useCallback } from 'react'
import { Layout } from '../components/Layout'
import { TraderDetailSlider } from '../components/TraderDetailSlider'
import { apiService, Trader, PaymentMethod } from '../services/api'

export const TradersPage: React.FC = () => {
  const [traders, setTraders] = useState<Trader[]>([])
  const [allTraders, setAllTraders] = useState<Trader[]>([]) // Для хранения всех трейдеров
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null)
  const [isSliderOpen, setIsSliderOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchTraders()
  }, [])

  const fetchTraders = async () => {
    try {
      setLoading(true)
      const data = await apiService.getTraders()
      setTraders(data)
      setAllTraders(data) // Сохраняем все трейдеры
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
        // Если поиск пустой, показываем всех трейдеров
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

  // Простая реализация debounce
  function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout
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
    
    // Обновляем также выбранного трейдера
    if (selectedTrader && selectedTrader.id === traderId) {
      setSelectedTrader(prev => prev ? {
        ...prev,
        payment_methods: [...prev.payment_methods, paymentMethod]
      } : null)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-4">
              <svg className="animate-spin h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
        <div className="p-6">
          <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-600 bg-opacity-20">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-white">
                    {searchQuery ? traders.length : allTraders.length}
                  </h3>
                  <p className="text-gray-400">
                    {searchQuery ? 'Найдено' : 'Всего трейдеров'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-600 bg-opacity-20">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-white">
                    {formatAmount(traders.reduce((sum, trader) => sum + parseFloat(trader.deposit_amount), 0).toString())}
                  </h3>
                  <p className="text-gray-400">
                    {searchQuery ? 'Депозит найденных' : 'Общий депозит'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-600 bg-opacity-20">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-white">
                    {traders.filter(trader => !trader.user_info.is_blocked).length}
                  </h3>
                  <p className="text-gray-400">Активных</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="flex justify-end">
              <div className="relative w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Поиск по имени, фамилии, отчеству..."
                />
                {searchLoading && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Search results info */}
            {searchQuery && (
              <div className="text-sm text-gray-400 mt-3 text-right">
                {searchQuery.length < 2 ? (
                  'Введите минимум 2 символа для поиска'
                ) : (
                  `Найдено ${traders.length} ${traders.length === 1 ? 'трейдер' : traders.length < 5 ? 'трейдера' : 'трейдеров'} по запросу "${searchQuery}"`
                )}
              </div>
            )}
          </div>

          {/* Traders Table */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Список трейдеров</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Трейдер
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Контакты
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Депозит
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Методы оплаты
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Дата регистрации
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {traders.map((trader) => (
                    <tr 
                      key={trader.id} 
                      className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => handleTraderClick(trader)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {trader.user_info.first_name.charAt(0)}{trader.user_info.last_name.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-white font-medium">
                              {trader.user_info.first_name} {trader.user_info.last_name}
                            </div>
                            {trader.user_info.patronymic_name && (
                              <div className="text-gray-400 text-sm">
                                {trader.user_info.patronymic_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-white">{trader.user_info.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-white font-medium">{formatAmount(trader.deposit_amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-300">
                          {trader.payment_methods.length > 0 ? (
                            <span className="bg-blue-900 text-blue-200 px-2 py-1 rounded-full text-xs">
                              {trader.payment_methods.length} метод{trader.payment_methods.length > 1 ? 'а' : ''}
                            </span>
                          ) : (
                            <span className="text-gray-500">Не настроены</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          trader.user_info.is_blocked 
                            ? 'bg-red-900 text-red-200' 
                            : 'bg-green-900 text-green-200'
                        }`}>
                          {trader.user_info.is_blocked ? 'Заблокирован' : 'Активен'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                        {formatDate(trader.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {traders.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-300">Нет трейдеров</h3>
                <p className="mt-1 text-sm text-gray-500">Пока нет зарегистрированных трейдеров.</p>
              </div>
            )}
          </div>
        </div>

        {/* Trader Detail Slider */}
        <TraderDetailSlider
          trader={selectedTrader}
          isOpen={isSliderOpen}
          onClose={handleCloseSlider}
          onPaymentMethodAdded={handlePaymentMethodAdded}
        />
      </div>
    </Layout>
  )
} 