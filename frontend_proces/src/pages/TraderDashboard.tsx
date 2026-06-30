import React, { useState, useEffect, useCallback } from 'react'
import { Layout } from '../components/Layout'
import { apiService, TraderDashboard as TraderDashboardType, TraderOrder } from '../services/api'

export const TraderDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<TraderDashboardType | null>(null)
  const [orders, setOrders] = useState<TraderOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [addingPayment, setAddingPayment] = useState(false)
  const [newPayment, setNewPayment] = useState({
    method_type: 'card' as 'card' | 'crypto_wallet',
    bank_name: '',
    card_number: '',
    card_holder_name: '',
    wallet_address: '',
    crypto_network: 'TRC20',
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [dashboardData, ordersData] = await Promise.all([
        apiService.getTraderDashboard(),
        apiService.getTraderOrders()
      ])
      setDashboard(dashboardData)
      setOrders(ordersData)
    } catch (err) {
      setError('Ошибка при загрузке данных')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingPayment(true)
    try {
      await apiService.addTraderPaymentMethod(newPayment)
      setShowAddPayment(false)
      setNewPayment({
        method_type: 'card',
        bank_name: '',
        card_number: '',
        card_holder_name: '',
        wallet_address: '',
        crypto_network: 'TRC20',
      })
      fetchData()
    } catch (err) {
      alert('Ошибка добавления реквизитов')
    }
    setAddingPayment(false)
  }

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Удалить реквизиты?')) return
    try {
      await apiService.deleteTraderPaymentMethod(id)
      fetchData()
    } catch (err) {
      alert('Ошибка удаления')
    }
  }

  const formatAmount = (amount: number | string) => {
    return new Intl.NumberFormat('ru-RU').format(Number(amount))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getAverageProcessingTime = () => {
    const completedOrders = orders.filter(order => 
      order.status === 'completed' && order.completed_at
    )
    
    if (completedOrders.length === 0) return '—'
    
    // Рассчитываем среднее время обработки
    const totalMinutes = completedOrders.reduce((total, order) => {
      const createdAt = new Date(order.created_at)
      const completedAt = new Date(order.completed_at!)
      const diffMs = completedAt.getTime() - createdAt.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return total + diffMinutes
    }, 0)
    
    const avgMinutes = Math.floor(totalMinutes / completedOrders.length)
    
    if (avgMinutes < 60) {
      return `${avgMinutes}м`
    } else {
      const hours = Math.floor(avgMinutes / 60)
      const minutes = avgMinutes % 60
      return minutes > 0 ? `${hours}ч ${minutes}м` : `${hours}ч`
    }
  }

  const getLastOrder = () => {
    if (orders.length === 0) return null
    return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  }

  const getPendingOrdersCount = () => {
    return orders.filter(order => order.status === 'new').length
  }

  const getPendingOrders = () => {
    return orders.filter(order => order.status === 'new').slice(0, 3) // Показываем только первые 3
  }

  const getPendingOrdersValue = () => {
    const pendingOrders = orders.filter(order => order.status === 'new')
    return pendingOrders.reduce((total, order) => total + parseFloat(order.amount_usdt), 0)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-600"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-white animate-pulse">Загружаем ваш дашборд...</h3>
            <p className="text-gray-400 text-sm mt-1">Получаем актуальные данные</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !dashboard) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-white">Ошибка загрузки</h3>
            <p className="mt-1 text-sm text-gray-400">{error}</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6 w-full animate-fadeIn">
        {/* Header */}
        <div className="mb-8 animate-slideDown">
          <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Добро пожаловать, {dashboard.trader_profile.user_info.first_name}!
          </h1>
          <p className="text-gray-400">Ваша статистика и информация о профиле</p>
          <div className="mt-2 h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Week Orders */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 hover:border-gray-600 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 group cursor-pointer">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-600 bg-opacity-20 group-hover:bg-opacity-30 transition-all duration-300 group-hover:scale-110">
                <svg className="w-6 h-6 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors duration-300 counter-animation">
                  {dashboard.week_stats.orders_count}
                </h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Заявок за неделю</p>
              </div>
            </div>
            <div className="mt-4 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse" style={{width: `${Math.min((dashboard.week_stats.orders_count / 10) * 100, 100)}%`}}></div>
            </div>
          </div>



          {/* Average Processing Time */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 hover:border-gray-600 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 group cursor-pointer">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-600 bg-opacity-20 group-hover:bg-opacity-30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
                <svg className="w-6 h-6 text-purple-400 group-hover:text-purple-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors duration-300">
                  {getAverageProcessingTime()}
                </h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Среднее время сделки</p>
              </div>
            </div>
            <div className="mt-4 flex items-center space-x-1">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i < 3 ? 'bg-purple-500 animate-pulse' : 'bg-gray-600'
                    }`}
                    style={{animationDelay: `${i * 200}ms`}}
                  ></div>
                ))}
              </div>
              <span className="text-xs text-gray-500 ml-2">Эффективность</span>
            </div>
          </div>

          {/* Pending Orders */}
          <div className={`bg-gray-800 border border-gray-700 rounded-lg p-6 transition-all duration-300 cursor-pointer group ${
            getPendingOrdersCount() > 0 
              ? 'hover:bg-yellow-900/20 hover:border-yellow-500/50 hover:shadow-xl hover:shadow-yellow-500/20 animate-pulse' 
              : 'hover:bg-gray-750 hover:border-gray-600'
          }`}>
            <div className="flex items-center">
              <div className={`p-3 rounded-full transition-all duration-300 group-hover:scale-110 ${
                getPendingOrdersCount() > 0 
                  ? 'bg-yellow-600 bg-opacity-30 group-hover:bg-opacity-50' 
                  : 'bg-yellow-600 bg-opacity-20 group-hover:bg-opacity-30'
              }`}>
                <svg className={`w-6 h-6 transition-all duration-300 ${
                  getPendingOrdersCount() > 0 
                    ? 'text-yellow-300 group-hover:text-yellow-200 animate-bounce' 
                    : 'text-yellow-400 group-hover:text-yellow-300'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className={`text-2xl font-bold transition-colors duration-300 ${
                  getPendingOrdersCount() > 0 
                    ? 'text-yellow-300 group-hover:text-yellow-200' 
                    : 'text-white group-hover:text-yellow-300'
                }`}>
                  {getPendingOrdersCount()}
                </h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">В ожидании</p>
              </div>
            </div>
            {getPendingOrdersCount() > 0 && (
              <div className="mt-4 flex items-center space-x-2">
                <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full animate-pulse"></div>
                </div>
                <span className="text-xs text-yellow-400 font-medium animate-pulse">Требует внимания!</span>
              </div>
            )}
          </div>
        </div>

        {/* Pending Orders - Full Width Priority */}
        {getPendingOrdersCount() > 0 && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-6 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-full bg-yellow-500/20 animate-pulse">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-yellow-300">Требуют обработки</h2>
                    <p className="text-gray-400 text-sm">Заявки ожидают вашего внимания</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-300">{getPendingOrdersCount()}</div>
                  <div className="text-yellow-400 text-sm font-medium">
                    {formatAmount(getPendingOrdersValue())} USDT
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getPendingOrders().map((order, index) => (
                  <div 
                    key={order.id}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800 hover:border-yellow-500/30 transition-all duration-300 hover:shadow-lg group/order"
                    style={{animationDelay: `${index * 100}ms`}}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-400 text-xs font-mono">#{order.id.slice(0, 8)}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.order_type === 'buy' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {order.order_type_display}
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-white font-semibold">{formatAmount(order.amount_usdt)} USDT</div>
                      <div className="text-gray-400 text-sm">{formatAmount(order.amount_kzt)} ₸</div>
                    </div>
                    
                    <div className="text-sm mb-3">
                      <div className="text-gray-400 mb-1">Клиент:</div>
                      <div className="text-gray-300">
                        {order.client_name === null ? '' : 
                         (order.client_name || 
                          (order.created_by_info 
                            ? `${order.created_by_info.first_name} ${order.created_by_info.last_name}` 
                            : 'Администратор'))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(
                        order.status === 'completed' && order.completed_at 
                          ? order.completed_at 
                          : order.created_at
                      ).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>

              {getPendingOrdersCount() > 3 && (
                <div className="mt-4 text-center">
                  <span className="text-yellow-400 text-sm">
                    и еще {getPendingOrdersCount() - 3} заявок ожидают обработки...
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Secondary Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Stats */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 hover:border-gray-600 transition-all duration-300 hover:shadow-xl group">
            <h2 className="text-xl font-semibold text-white mb-6 group-hover:text-blue-300 transition-colors duration-300">Статистика за месяц</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-2 rounded hover:bg-gray-700/50 transition-colors duration-200">
                <span className="text-gray-400">Количество заявок:</span>
                <span className="text-white font-medium group-hover:text-blue-300 transition-colors duration-300">
                  {dashboard.month_stats.orders_count}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded hover:bg-gray-700/50 transition-colors duration-200">
                <span className="text-gray-400">Объем торгов:</span>
                <span className="text-purple-400 font-medium group-hover:text-purple-300 transition-colors duration-300">
                  {formatAmount(dashboard.month_stats.total_volume_usdt)} USDT
                </span>
              </div>
            </div>
            <div className="mt-4 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" style={{width: `${Math.min((dashboard.month_stats.orders_count / 20) * 100, 100)}%`}}></div>
            </div>
          </div>



          {/* Payment Methods */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 hover:border-gray-600 transition-all duration-300 hover:shadow-xl group">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors duration-300">Способы оплаты</h2>
              <button
                onClick={() => setShowAddPayment(true)}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                + Добавить
              </button>
            </div>
            <div className="space-y-4">
              {dashboard.trader_profile.payment_methods.map((method, index) => {
                const getLastDigits = () => {
                  if (method.method_type === 'card' && method.card_number) {
                    return method.card_number.replace(/\s/g, '').slice(-4)
                  } else if (method.method_type === 'crypto_wallet' && method.wallet_address) {
                    return method.wallet_address.slice(-4)
                  }
                  return '••••'
                }

                return (
                  <div 
                    key={method.id} 
                    className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-all duration-300 group/method"
                    style={{animationDelay: `${index * 100}ms`}}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {method.method_type === 'card' ? (
                          <div className="w-12 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-md flex items-center justify-center shadow-lg">
                            <span className="text-white text-xs font-bold tracking-wider">{getLastDigits()}</span>
                          </div>
                        ) : (
                          <div className="w-12 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-md flex items-center justify-center shadow-lg">
                            <span className="text-white text-xs font-bold tracking-wider">{getLastDigits()}</span>
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{method.method_type_display}</p>
                          <p className="text-gray-400 text-sm">
                            {method.method_type === 'card' ? method.bank_name : `${method.crypto_network} кошелек`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${method.is_active ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
                        <button
                          onClick={() => handleDeletePayment(method.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {dashboard.trader_profile.payment_methods.length === 0 && (
                <div className="text-center py-6">
                  <svg className="mx-auto h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-400">Нет добавленных способов оплаты</p>
                  <button
                    onClick={() => setShowAddPayment(true)}
                    className="mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm rounded-lg transition-colors"
                  >
                    Добавить реквизиты
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Payment Modal */}
        {showAddPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddPayment(false)} />
            <div className="relative bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">Добавить реквизиты</h3>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPayment({ ...newPayment, method_type: 'card' })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      newPayment.method_type === 'card' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    💳 Карта
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPayment({ ...newPayment, method_type: 'crypto_wallet' })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      newPayment.method_type === 'crypto_wallet' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    🪙 Крипто
                  </button>
                </div>

                {newPayment.method_type === 'card' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Название банка"
                      value={newPayment.bank_name}
                      onChange={(e) => setNewPayment({ ...newPayment, bank_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Номер карты"
                      value={newPayment.card_number}
                      onChange={(e) => setNewPayment({ ...newPayment, card_number: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Имя держателя"
                      value={newPayment.card_holder_name}
                      onChange={(e) => setNewPayment({ ...newPayment, card_holder_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500"
                      required
                    />
                  </>
                ) : (
                  <>
                    <select
                      value={newPayment.crypto_network}
                      onChange={(e) => setNewPayment({ ...newPayment, crypto_network: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white"
                    >
                      <option value="TRC20">TRC20</option>
                      <option value="ERC20">ERC20</option>
                      <option value="BEP20">BEP20</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Адрес кошелька"
                      value={newPayment.wallet_address}
                      onChange={(e) => setNewPayment({ ...newPayment, wallet_address: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500"
                      required
                    />
                  </>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddPayment(false)}
                    className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={addingPayment}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-colors"
                  >
                    {addingPayment ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Profile Info */}
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Информация о профиле</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-400 text-sm">Дата регистрации</p>
              <p className="text-white font-medium">{formatDate(dashboard.trader_profile.created_at)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Телефон</p>
              <p className="text-white font-medium">{dashboard.trader_profile.user_info.phone}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Статус</p>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${dashboard.trader_profile.user_info.is_online ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <span className="text-white font-medium">
                  {dashboard.trader_profile.user_info.is_online ? 'Онлайн' : 'Оффлайн'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 