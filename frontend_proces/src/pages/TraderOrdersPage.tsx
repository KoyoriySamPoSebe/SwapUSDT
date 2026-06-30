import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { OrderChat } from '../components/OrderChat'
import { apiService, TraderOrder } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const ORDER_STATUSES = {
  'new': { title: 'Новые', color: 'bg-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  'in_progress': { title: 'В обработке', color: 'bg-yellow-500', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  'completed': { title: 'Завершены', color: 'bg-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  'cancelled': { title: 'Отменены', color: 'bg-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200' }
}

// Компонент для отображения платежной информации клиента
const ClientPaymentInfo: React.FC<{ order: TraderOrder }> = ({ order }) => {
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // Парсим платежную информацию клиента
  const parseClientPaymentInfo = () => {
    const info = order.client_payment_info
    
    // Проверяем на криптокошелек (содержит "Crypto" или длинный адрес)
    if (info.includes('Crypto') || info.includes('TRC20') || info.includes('ERC20') || info.includes('BEP20')) {
      const parts = info.split(' - ')
      if (parts.length >= 2) {
        const network = parts[0].replace('Crypto ', '')
        const address = parts[1]
        return {
          type: 'crypto',
          network: network,
          address: address,
          copyValue: address
        }
      }
    }
    
    // Проверяем на банковскую карту (содержит **** или номер карты)
    if (info.includes('****') || /\d{4}\s?\d{4}\s?\d{4}\s?\d{4}/.test(info)) {
      const parts = info.split(' - ')
      if (parts.length >= 3) {
        const bank = parts[0]
        const holder = parts[1]
        const cardNumber = parts[2]
        
        // Извлекаем полный номер карты из заявки (если доступен)
        // Для демонстрации используем замаскированный номер
        const fullCardNumber = cardNumber.replace(/\*/g, '•')
        
        return {
          type: 'card',
          bank: bank,
          holder: holder,
          cardNumber: fullCardNumber,
          copyValue: cardNumber.replace(/\*+/g, '').replace(/\s/g, '') // Убираем звездочки и пробелы для копирования
        }
      }
    }
    
    // Fallback - показываем как есть
    return {
      type: 'unknown',
      raw: info,
      copyValue: info
    }
  }

  const paymentInfo = parseClientPaymentInfo()

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      setTimeout(() => setCopiedText(null), 2000)
    } catch (err) {
      console.error('Ошибка копирования:', err)
    }
  }

  return (
    <div className="bg-gray-700/50 p-2 rounded">
      {paymentInfo.type === 'crypto' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-orange-400 text-xs font-medium">
              Криптокошелек {paymentInfo.network}
            </span>
          </div>
          <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded">
            <div className="flex-1 min-w-0">
              <div className="text-gray-300 text-xs font-mono break-all">
                {paymentInfo.address}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(paymentInfo.copyValue)}
              className="ml-2 p-1 hover:bg-gray-600 rounded transition-colors flex-shrink-0"
              title="Скопировать адрес"
            >
              {copiedText === paymentInfo.copyValue ? (
                <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {paymentInfo.type === 'card' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 text-xs font-medium">
              Банковская карта
            </span>
          </div>
          <div className="text-gray-300 text-xs">
            <div className="mb-1">{paymentInfo.bank}</div>
            <div className="mb-2 text-gray-400">{paymentInfo.holder}</div>
          </div>
          <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded">
            <div className="flex-1">
              <div className="text-gray-300 text-xs font-mono">
                {paymentInfo.cardNumber}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(paymentInfo.copyValue)}
              className="ml-2 p-1 hover:bg-gray-600 rounded transition-colors flex-shrink-0"
              title="Скопировать номер карты"
            >
              {copiedText === paymentInfo.copyValue ? (
                <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {paymentInfo.type === 'unknown' && (
        <div className="flex items-center justify-between">
          <div className="text-gray-300 text-xs flex-1">
            {paymentInfo.raw}
          </div>
          <button
            onClick={() => copyToClipboard(paymentInfo.copyValue)}
            className="ml-2 p-1 hover:bg-gray-600 rounded transition-colors flex-shrink-0"
            title="Скопировать"
          >
            {copiedText === paymentInfo.copyValue ? (
              <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export const TraderOrdersPage: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<TraderOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggedOrder, setDraggedOrder] = useState<TraderOrder | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [orderTypeFilter, setOrderTypeFilter] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(true)
  const [chatOrder, setChatOrder] = useState<TraderOrder | null>(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const data = await apiService.getTraderOrders()
        setOrders(data)
      } catch (err) {
        setError('Ошибка при загрузке заявок')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('ru-RU').format(Number(amount))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFilteredOrders = () => {
    let filtered = orders

    // Фильтр по типу заявки
    if (orderTypeFilter) {
      filtered = filtered.filter(order => order.order_type === orderTypeFilter)
    }

    // Не фильтруем завершенные заявки здесь - это делается в getOrdersByStatus
    // чтобы drag&drop в колонку "Завершены" продолжал работать

    return filtered
  }

  const getOrdersByStatus = (status: string) => {
    const filteredOrders = getFilteredOrders()
    const statusOrders = filteredOrders.filter(order => order.status === status)
    
    // Если статус "completed" и тумблер выключен, возвращаем пустой массив
    if (status === 'completed' && !showCompleted) {
      return []
    }
    
    return statusOrders
  }

  const handleDragStart = (e: React.DragEvent, order: TraderOrder) => {
    setDraggedOrder(order)
    e.dataTransfer.effectAllowed = 'move'
    
    // Добавляем визуальный эффект при начале перетаскивания
    const target = e.target as HTMLElement
    target.style.opacity = '0.5'
    target.style.transform = 'rotate(5deg) scale(1.05)'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    // Сбрасываем визуальные эффекты при завершении перетаскивания
    const target = e.target as HTMLElement
    target.style.opacity = ''
    target.style.transform = ''
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(status)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Проверяем, что мы действительно покинули колонку, а не просто перешли на дочерний элемент
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverColumn(null)
    }
  }

  const calculateCommission = (order: TraderOrder): string => {
    // Рассчитываем комиссию как 1% от суммы в тенге
    const commission = (parseFloat(order.amount_kzt) * 0.01).toFixed(2)
    return commission
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    setDragOverColumn(null)
    
    if (!draggedOrder || draggedOrder.status === newStatus) {
      setDraggedOrder(null)
      return
    }

    // Сохраняем оригинальное состояние для отката
    const originalOrders = [...orders]

    try {
      // Обновляем статус заявки локально для мгновенного отклика
      setOrders(prev => prev.map(order => 
        order.id === draggedOrder.id 
          ? { ...order, status: newStatus, status_display: ORDER_STATUSES[newStatus as keyof typeof ORDER_STATUSES].title }
          : order
      ))

      // Рассчитываем комиссию если статус "completed"
      const commission = newStatus === 'completed' ? calculateCommission(draggedOrder) : undefined

      // API вызов для обновления статуса на сервере
      const updatedOrder = await apiService.updateTraderOrderStatus(draggedOrder.id, newStatus, commission)
      
      // Обновляем заявку с данными с сервера
      setOrders(prev => prev.map(order => 
        order.id === draggedOrder.id ? updatedOrder : order
      ))
      
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error)
      // Откат изменений в случае ошибки
      setOrders(originalOrders)
      alert('Ошибка при обновлении статуса заявки')
    } finally {
      setDraggedOrder(null)
      
      // Сбрасываем визуальные эффекты
      document.querySelectorAll('[draggable="true"]').forEach(el => {
        const element = el as HTMLElement
        element.style.opacity = ''
        element.style.transform = ''
      })
    }
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
            <h3 className="text-lg font-medium text-white animate-pulse">Загружаем ваши заявки...</h3>
            <p className="text-gray-400 text-sm mt-1">Подготавливаем канбан доску</p>
          </div>
          
          {/* Loading skeleton */}
          <div className="w-full max-w-6xl mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse" style={{animationDelay: `${i * 200}ms`}}>
                  <div className="h-6 bg-gray-700 rounded mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-24 bg-gray-800 rounded-lg"></div>
                    <div className="h-24 bg-gray-800 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
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
            Мои заявки
          </h1>
          <p className="text-gray-400">Управление заявками в режиме канбан доски</p>
          <div className="mt-2 h-1 w-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 hover:border-gray-600 transition-all duration-300 hover:shadow-xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Type Filter */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 text-sm font-medium">Тип заявки:</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setOrderTypeFilter(null)}
                  className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                    orderTypeFilter === null
                      ? 'bg-blue-600 text-white shadow-blue-500/30'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                  }`}
                >
                  Все
                </button>
                <button
                  onClick={() => setOrderTypeFilter('buy')}
                  className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                    orderTypeFilter === 'buy'
                      ? 'bg-green-600 text-white shadow-green-500/30'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                  }`}
                >
                  Покупка
                </button>
                <button
                  onClick={() => setOrderTypeFilter('sell')}
                  className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                    orderTypeFilter === 'sell'
                      ? 'bg-orange-600 text-white shadow-orange-500/30'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                  }`}
                >
                  Продажа
                </button>
              </div>
            </div>

            {/* Show Completed Toggle */}
            <div className="flex items-center space-x-3">
              <span className="text-gray-300 text-sm font-medium">Показать завершенные:</span>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none hover:scale-105
                  ${showCompleted ? 'bg-green-500 shadow-green-500/30' : 'bg-gray-600 hover:bg-gray-500'}
                `}
                title={showCompleted ? 'Скрыть завершенные' : 'Показать завершенные'}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 shadow-lg
                    ${showCompleted ? 'translate-x-6 bg-green-100' : 'translate-x-1'}
                  `}
                />
              </button>
              <span className="text-gray-400 text-sm">
                {showCompleted ? 'Включено' : 'Выключено'}
              </span>
            </div>
          </div>

          {/* Active Filters Indicator */}
          {(orderTypeFilter || !showCompleted) && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
                <span className="text-sm text-gray-300">Активные фильтры:</span>
                {orderTypeFilter && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    orderTypeFilter === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                  }`}>
                    {orderTypeFilter === 'buy' ? 'Покупка' : 'Продажа'}
                  </span>
                )}
                {!showCompleted && (
                  <span className="bg-gray-500/20 text-gray-400 px-2 py-1 rounded text-xs font-medium">
                    Без завершенных
                  </span>
                )}
                <button
                  onClick={() => {
                    setOrderTypeFilter(null)
                    setShowCompleted(true)
                  }}
                  className="text-xs text-gray-400 hover:text-white ml-2"
                >
                  Сбросить все
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(ORDER_STATUSES).map(([status, config]) => {
            const statusOrders = getOrdersByStatus(status)
            
            return (
              <div key={status} className="flex flex-col animate-fadeIn" style={{animationDelay: `${Object.keys(ORDER_STATUSES).indexOf(status) * 150}ms`}}>
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 group cursor-pointer hover:bg-gray-800/30 p-2 rounded-lg transition-all duration-300">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${config.color} group-hover:scale-125 transition-transform duration-300 ${statusOrders.length > 0 ? 'animate-pulse' : ''}`}></div>
                    <h2 className="text-lg font-semibold text-white group-hover:text-gray-300 transition-colors duration-300">{config.title}</h2>
                    <span className={`text-xs px-2 py-1 rounded-full transition-all duration-300 group-hover:scale-110 ${
                      statusOrders.length > 0 
                        ? `${config.color.replace('bg-', 'bg-')}/20 ${config.color.replace('bg-', 'text-')} animate-pulse` 
                        : 'bg-gray-700 text-gray-300'
                    }`}>
                      {statusOrders.length}
                    </span>
                  </div>
                </div>

                {/* Drop Zone */}
                <div
                  className={`min-h-[500px] border-2 border-dashed rounded-lg p-4 space-y-3 transition-all duration-300 ${
                    dragOverColumn === status
                      ? 'bg-blue-500/20 border-blue-400 shadow-lg shadow-blue-500/20'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800/70'
                  }`}
                  onDragOver={(e) => handleDragOver(e, status)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  {statusOrders.map((order, index) => (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order)}
                      onDragEnd={handleDragEnd}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-move hover:bg-gray-750 transition-all duration-300 hover:border-gray-600 hover:shadow-xl hover:shadow-blue-500/10 hover:scale-105 group animate-fadeIn"
                      style={{animationDelay: `${index * 100 + Object.keys(ORDER_STATUSES).indexOf(status) * 200}ms`}}
                    >
                                              {/* Order Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 group-hover:scale-105 ${
                              order.order_type === 'buy' 
                                ? 'bg-green-500/20 text-green-400 group-hover:bg-green-500/30 group-hover:text-green-300' 
                                : 'bg-orange-500/20 text-orange-400 group-hover:bg-orange-500/30 group-hover:text-orange-300'
                            }`}>
                              {order.order_type_display}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 font-mono group-hover:text-gray-300 transition-colors duration-300">
                            #{order.id.slice(0, 8)}
                          </div>
                        </div>

                                              {/* Amount Info */}
                        <div className="mb-3 p-2 rounded hover:bg-gray-700/30 transition-colors duration-200">
                          <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors duration-300">
                            {formatAmount(order.amount_usdt)} USDT
                          </div>
                          <div className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors duration-300">
                            {formatAmount(order.amount_kzt)} ₸
                          </div>
                          <div className="text-gray-500 text-xs group-hover:text-gray-400 transition-colors duration-300">
                            Курс: {order.rate} ₸/USDT
                          </div>
                        </div>

                                              {/* Client Info */}
                        <div className="mb-3 text-sm p-2 rounded hover:bg-gray-700/30 transition-colors duration-200">
                          <div className="text-gray-400 text-xs mb-1">Клиент:</div>
                          <div className="text-white group-hover:text-green-300 transition-colors duration-300 font-medium">
                            {order.client_name === null ? '' : (order.client_name || 'Не указан')}
                          </div>
                        </div>

                                             {/* Payment Info */}
                       <div className="mb-3 text-sm">
                         <div className="text-gray-400 text-xs mb-1">Способ оплаты клиента:</div>
                         <ClientPaymentInfo order={order} />
                       </div>

                      {/* Notes */}
                      {order.notes && (
                        <div className="mb-3 text-sm">
                          <div className="text-gray-400 text-xs mb-1">Примечание:</div>
                          <div className="text-gray-300 text-xs italic">
                            "{order.notes}"
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                        <div className="text-xs text-gray-500">
                          {order.status === 'completed' && order.completed_at 
                            ? formatDate(order.completed_at)
                            : formatDate(order.created_at)}
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setChatOrder(order)
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200"
                            title="Открыть чат"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </button>
                          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Empty State */}
                  {statusOrders.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-500 animate-fadeIn">
                      <div className="p-4 rounded-full bg-gray-700/30 mb-3 hover:bg-gray-700/50 transition-colors duration-300">
                        <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-sm">Нет заявок</p>
                      <div className="mt-2 text-xs text-gray-600">Перетащите сюда для изменения статуса</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Drag Instructions */}
        <div className="mt-8 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-4 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 animate-fadeIn">
          <div className="flex items-center space-x-3 text-gray-400">
            <div className="p-2 rounded-full bg-blue-500/20 animate-pulse">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <div>
              <span className="text-sm text-blue-300 font-medium">Drag & Drop</span>
              <p className="text-xs text-gray-400 mt-1">Перетащите заявки между колонками для изменения их статуса</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      {chatOrder && user && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setChatOrder(null)}
        >
          <div
            className="w-full max-w-lg animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {chatOrder.order_type_display} · {formatAmount(chatOrder.amount_usdt)} USDT
                </h3>
                <p className="text-xs text-gray-400 font-mono">#{chatOrder.id.slice(0, 8)}</p>
              </div>
              <button
                onClick={() => setChatOrder(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <OrderChat orderId={chatOrder.id} currentUserId={user.id} />
          </div>
        </div>
      )}
    </Layout>
  )
} 