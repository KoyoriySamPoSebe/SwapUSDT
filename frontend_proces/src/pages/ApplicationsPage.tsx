import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { apiService, Order, Trader } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export const ApplicationsPage: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [traders, setTraders] = useState<any[]>([])
  const [createLoading, setCreateLoading] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [ordersData, tradersData] = await Promise.all([
          apiService.getAllOrders(),
          apiService.getTraders()
        ])
        setOrders(ordersData)
        setTraders(tradersData)
      } catch (err) {
        setError('Ошибка при загрузке данных')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAmount = (amount: string) => {
    return parseFloat(amount).toLocaleString('ru-RU')
  }

  // Функция для получения имени клиента с учетом роли создателя
  const getClientDisplayName = (order: Order) => {
    // Если client_name == null, ничего не отображаем
    if (order.client_name === null) {
      return ''
    }
    
    // Если есть client_name, используем его
    if (order.client_name) {
      return order.client_name
    }
    
    // Если есть client_card_holder, используем его
    if (order.client_card_holder) {
      return order.client_card_holder
    }
    
    // Если created_by_info undefined (заказ создан админом) или создатель админ
    if (!order.created_by_info || order.created_by_info.role === 'admin') {
      return user?.role === 'admin' ? `${user.first_name} ${user.last_name}` : 'Администратор'
    }
    
    // Иначе используем информацию о создателе
    return `${order.created_by_info.first_name} ${order.created_by_info.last_name}`
  }

  // Функция для получения телефона клиента с учетом роли создателя
  const getClientPhone = (order: Order) => {
    // Если created_by_info undefined (заказ создан админом) или создатель админ
    if (!order.created_by_info || order.created_by_info.role === 'admin') {
      return user?.role === 'admin' ? user.phone : 'N/A'
    }
    
    return order.created_by_info.phone
  }

  const getStatusBadge = (status: string, statusDisplay: string) => {
    const statusColors = {
      'in_progress': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'completed': 'bg-green-500/20 text-green-400 border-green-500/30',
      'cancelled': 'bg-red-500/20 text-red-400 border-red-500/30',
      'pending': 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }

    const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${colorClass}`}>
        {statusDisplay}
      </span>
    )
  }

  const getOrderTypeBadge = (orderType: string, orderTypeDisplay: string) => {
    const typeColors = {
      'buy': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'sell': 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    }

    const colorClass = typeColors[orderType as keyof typeof typeColors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${colorClass}`}>
        {orderTypeDisplay}
      </span>
    )
  }

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }

  const handleCreateOrder = async (formData: any) => {
    try {
      setCreateLoading(true)
      const newOrder = await apiService.createOrder(formData)
      setOrders(prev => [newOrder, ...prev])
      setShowCreateModal(false)
    } catch (err) {
      console.error('Ошибка при создании заявки:', err)
      alert('Ошибка при создании заявки')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleUpdateOrder = async (formData: any) => {
    if (!editingOrder) return
    
    try {
      setUpdateLoading(true)
      const updatedOrder = await apiService.updateOrder(editingOrder.id, formData)
      setOrders(prev => prev.map(order => order.id === editingOrder.id ? updatedOrder : order))
      setShowEditModal(false)
      setEditingOrder(null)
    } catch (err) {
      console.error('Ошибка при обновлении заявки:', err)
      alert('Ошибка при обновлении заявки')
    } finally {
      setUpdateLoading(false)
    }
  }

  const openEditModal = (order: Order) => {
    setEditingOrder(order)
    setShowEditModal(true)
  }

  // Filter orders based on selected filters
  const filteredOrders = orders.filter(order => {
    if (statusFilter && order.status !== statusFilter) return false
    if (typeFilter && order.order_type !== typeFilter) return false
    return true
  })

  // Group orders by status priority: pending first, completed last
  const getGroupedOrders = () => {
    const statusPriority = ['new', 'in_progress', 'completed', 'cancelled']
    
    const grouped = statusPriority.reduce((acc, status) => {
      const statusOrders = filteredOrders.filter(order => order.status === status)
      if (statusOrders.length > 0) {
        acc.push({
          status,
          statusDisplay: getStatusDisplay(status),
          orders: statusOrders,
          color: getStatusColor(status)
        })
      }
      return acc
    }, [] as Array<{status: string, statusDisplay: string, orders: Order[], color: string}>)
    
    return grouped
  }

  const getStatusDisplay = (status: string) => {
    const statusMap: {[key: string]: string} = {
      'new': 'Новые заявки',
      'in_progress': 'В обработке', 
      'completed': 'Завершенные',
      'cancelled': 'Отмененные'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: {[key: string]: string} = {
      'new': 'border-blue-500/30 bg-blue-500/5',
      'in_progress': 'border-yellow-500/30 bg-yellow-500/5',
      'completed': 'border-green-500/30 bg-green-500/5',
      'cancelled': 'border-red-500/30 bg-red-500/5'
    }
    return colorMap[status] || 'border-gray-500/30 bg-gray-500/5'
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(statusFilter === status ? null : status)
  }

  const handleTypeFilter = (type: string) => {
    setTypeFilter(typeFilter === type ? null : type)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      </Layout>
    )
  }

      return (
      <Layout>
        <div className="p-6">
          <div className="flex gap-8">
        {/* Statistics Sidebar */}
        <div className="w-80 flex-shrink-0 space-y-4">
          {/* Total Orders */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-400">Всего заявок</p>
                <p className="text-2xl font-bold text-white">{orders.length}</p>
              </div>
            </div>
          </div>

          {/* Status Statistics */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">По статусам</h3>
              {statusFilter && (
                <button
                  onClick={() => setStatusFilter(null)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Сбросить
                </button>
              )}
            </div>
            <div className="space-y-2">
              {['in_progress', 'completed', 'pending', 'cancelled'].map(status => {
                const count = orders.filter(order => order.status === status).length
                const statusDisplay = {
                  'in_progress': 'В обработке',
                  'completed': 'Завершено',
                  'pending': 'Ожидание',
                  'cancelled': 'Отменено'
                }[status]
                const colors = {
                  'in_progress': 'text-yellow-400',
                  'completed': 'text-green-400',
                  'pending': 'text-blue-400',
                  'cancelled': 'text-red-400'
                }[status]
                const isActive = statusFilter === status
                
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusFilter(status)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-gray-700 border border-gray-600' 
                        : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <span className={`text-sm ${colors} ${isActive ? 'font-medium' : ''}`}>
                      {statusDisplay}
                    </span>
                    <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Order Types */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">По типам</h3>
              {typeFilter && (
                <button
                  onClick={() => setTypeFilter(null)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Сбросить
                </button>
              )}
            </div>
            <div className="space-y-2">
              {['buy', 'sell'].map(type => {
                const count = orders.filter(order => order.order_type === type).length
                const typeDisplay = type === 'buy' ? 'Покупка' : 'Продажа'
                const color = type === 'buy' ? 'text-emerald-400' : 'text-orange-400'
                const isActive = typeFilter === type
                
                return (
                  <button
                    key={type}
                    onClick={() => handleTypeFilter(type)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-gray-700 border border-gray-600' 
                        : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <span className={`text-sm ${color} ${isActive ? 'font-medium' : ''}`}>
                      {typeDisplay}
                    </span>
                    <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Volume Statistics */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Объемы</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Общий USDT</span>
                <span className="text-sm font-medium text-white">
                  {formatAmount(orders.reduce((sum, order) => sum + parseFloat(order.amount_usdt), 0).toString())}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Общий KZT</span>
                <span className="text-sm font-medium text-emerald-400">
                  {formatAmount(orders.reduce((sum, order) => sum + parseFloat(order.amount_kzt), 0).toString())} ₸
                </span>
              </div>
            </div>
          </div>

          {/* Create Order Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Создать заявку</span>
          </button>
        </div>

        {/* Orders List */}
        <div className="flex-1 space-y-3">
          {/* Filter indicator */}
          {(statusFilter || typeFilter) && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                  </svg>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-300">Фильтры:</span>
                    {statusFilter && (
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs flex items-center space-x-1">
                        <span>{({'in_progress': 'В обработке', 'completed': 'Завершено', 'pending': 'Ожидание', 'cancelled': 'Отменено'})[statusFilter]}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setStatusFilter(null)
                          }}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    )}
                    {typeFilter && (
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs flex items-center space-x-1">
                        <span>{typeFilter === 'buy' ? 'Покупка' : 'Продажа'}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setTypeFilter(null)
                          }}
                          className="text-green-400 hover:text-green-300"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    )}
                    <span className="text-xs text-gray-400">({filteredOrders.length} из {orders.length})</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStatusFilter(null)
                    setTypeFilter(null)
                  }}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Сбросить все
                </button>
              </div>
            </div>
          )}

          {getGroupedOrders().map((group, groupIndex) => (
            <div key={group.status} className={`mb-8 border rounded-xl p-6 transition-all duration-300 hover:shadow-lg ${group.color} animate-fadeIn`} style={{animationDelay: `${groupIndex * 200}ms`}}>
              {/* Group Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    group.status === 'new' ? 'bg-blue-500 animate-pulse' :
                    group.status === 'in_progress' ? 'bg-yellow-500 animate-bounce' :
                    group.status === 'completed' ? 'bg-green-500' :
                    'bg-red-500'
                  }`}></div>
                  <h2 className="text-xl font-semibold text-white">{group.statusDisplay}</h2>
                  <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
                    {group.orders.length}
                  </span>
                </div>
              </div>

              {/* Orders in this group */}
              <div className="space-y-4">
                {group.orders.map((order, orderIndex) => {
                  const isExpanded = expandedOrders.has(order.id)
                  
                  return (
                    <div key={order.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:bg-gray-750 transition-all duration-200 hover:border-gray-600 animate-fadeIn" style={{animationDelay: `${groupIndex * 200 + orderIndex * 50}ms`}}>
                {/* Collapsed Header - Always Visible */}
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => toggleOrderExpansion(order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-mono text-gray-400 bg-gray-900 px-3 py-1 rounded-lg">
                        #{order.id.slice(0, 8)}
                      </div>
                      {getOrderTypeBadge(order.order_type, order.order_type_display)}
                      {getStatusBadge(order.status, order.status_display)}
                      
                      {/* Quick Info */}
                      <div className="hidden md:flex items-center space-x-4 text-sm">
                        <span className="text-gray-400">
                          {formatAmount(order.amount_usdt)} USDT → {formatAmount(order.amount_kzt)} ₸
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-400">
                          {getClientDisplayName(order)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="text-sm text-gray-400">
                        {order.status === 'completed' && order.completed_at 
                          ? formatDate(order.completed_at)
                          : formatDate(order.created_at)}
                      </div>
                      
                      {/* Edit Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditModal(order)
                        }}
                        className="text-gray-400 hover:text-blue-400 transition-colors"
                        title="Редактировать заявку"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      {/* Expand/Collapse Icon */}
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-700/50">
                    {/* Main Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                      {/* Amount & Rate */}
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-300 mb-3">Сумма и курс</h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">USDT:</span>
                            <span className="text-lg font-semibold text-white">{formatAmount(order.amount_usdt)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Тенге:</span>
                            <span className="text-lg font-semibold text-emerald-400">{formatAmount(order.amount_kzt)} ₸</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-gray-700 pt-2">
                            <span className="text-sm text-gray-400">Курс:</span>
                            <span className="text-sm font-medium text-blue-400">{formatAmount(order.rate)} ₸</span>
                          </div>
                        </div>
                      </div>

                      {/* Participants */}
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-300 mb-3">Участники</h3>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-xs text-gray-400 uppercase tracking-wide">Клиент</span>
                            </div>
                            <div className="text-sm font-medium text-white">
                              {getClientDisplayName(order)}
                            </div>
                            <div className="text-xs text-gray-400">{getClientPhone(order)}</div>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-gray-400 uppercase tracking-wide">Трейдер</span>
                            </div>
                            <div className="text-sm font-medium text-white">
                              {order.assigned_trader_info.first_name} {order.assigned_trader_info.last_name}
                            </div>
                            <div className="text-xs text-gray-400">{order.assigned_trader_info.phone}</div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Info */}
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-300 mb-3">Платежная информация</h3>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs text-gray-400 uppercase tracking-wide">Трейдер</span>
                            </div>
                            <div className="text-xs text-gray-300 bg-gray-800 rounded px-2 py-1">
                              {order.trader_payment_info}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs text-gray-400 uppercase tracking-wide">Клиент</span>
                            </div>
                            <div className="text-xs text-gray-300 bg-gray-800 rounded px-2 py-1">
                              {order.client_payment_info}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="flex items-start space-x-2">
                          <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <div>
                            <span className="text-xs text-gray-400 uppercase tracking-wide">Примечание</span>
                            <p className="text-sm text-gray-300 mt-1">{order.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {getGroupedOrders().length === 0 && orders.length > 0 && (
            <div className="text-center py-12 animate-fadeIn">
              <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-400">Нет заявок по фильтру</h3>
              <p className="mt-1 text-sm text-gray-500">Попробуйте изменить критерии фильтрации</p>
            </div>
          )}

          {orders.length === 0 && (
            <div className="text-center py-12 animate-fadeIn">
              <svg className="mx-auto h-12 w-12 text-gray-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-400">Нет заявок</h3>
              <p className="mt-1 text-sm text-gray-500">Заявки пока не созданы</p>
            </div>
          )}
                </div>
          </div>
        </div>

        {/* Create Order Modal */}
        {showCreateModal && (
          <CreateOrderModal
            traders={traders}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateOrder}
            loading={createLoading}
          />
        )}

        {/* Edit Order Modal */}
        {showEditModal && editingOrder && (
          <EditOrderModal
            order={editingOrder}
            traders={traders}
            onClose={() => {
              setShowEditModal(false)
              setEditingOrder(null)
            }}
            onSubmit={handleUpdateOrder}
            loading={updateLoading}
          />
        )}
      </Layout>
    )
  }

  // Create Order Modal Component
  const CreateOrderModal: React.FC<{
    traders: Trader[]
    onClose: () => void
    onSubmit: (data: any) => void
    loading: boolean
  }> = ({ traders, onClose, onSubmit, loading }) => {
    const [formData, setFormData] = useState({
      order_type: 'buy' as 'buy' | 'sell',
      amount_usdt: '',
      rate: '',
      trader_id: '',
      trader_payment_method_id: '',
      notes: '',
      client_name: '',
      client_payment_type: 'card' as 'card' | 'crypto_wallet',
      client_bank_name: '',
      client_card_number: '',
      client_card_holder: '',
      client_wallet_address: '',
      client_crypto_network: 'TRC20'
    })

    // Auto update client payment type based on order type
    React.useEffect(() => {
      setFormData(prev => ({
        ...prev,
        client_payment_type: prev.order_type === 'buy' ? 'card' : 'crypto_wallet',
        trader_payment_method_id: '' // Reset trader payment method when order type changes
      }))
    }, [formData.order_type])

    const selectedTrader = traders.find(t => t.user_info.id === formData.trader_id)

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      
      const submitData: any = {
        order_type: formData.order_type,
        amount_usdt: formData.amount_usdt,
        rate: formData.rate,
        trader_id: formData.trader_id,
        trader_payment_method_id: formData.trader_payment_method_id,
        notes: formData.notes,
        client_name: formData.client_name || null,
        client_payment_type: formData.client_payment_type
      }

      if (formData.client_payment_type === 'card') {
        submitData.client_bank_name = formData.client_bank_name
        submitData.client_card_number = formData.client_card_number
        submitData.client_card_holder = formData.client_card_holder
      } else {
        submitData.client_wallet_address = formData.client_wallet_address
        submitData.client_crypto_network = formData.client_crypto_network
      }

      onSubmit(submitData)
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Создать заявку</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Order Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Тип заявки</label>
                <select
                  value={formData.order_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, order_type: e.target.value as 'buy' | 'sell' }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  required
                >
                  <option value="buy">Покупка</option>
                  <option value="sell">Продажа</option>
                </select>
              </div>

              {/* Amount and Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Сумма USDT</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount_usdt}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount_usdt: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Курс (₸)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              {/* Trader Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Трейдер</label>
                <select
                  value={formData.trader_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, trader_id: e.target.value, trader_payment_method_id: '' }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  required
                >
                  <option value="">Выберите трейдера</option>
                  {traders.map(trader => (
                    <option key={trader.id} value={trader.user_info.id}>
                      {trader.user_info.first_name} {trader.user_info.last_name} ({trader.user_info.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              {selectedTrader && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {formData.order_type === 'buy' 
                      ? 'Криптокошелек трейдера (для получения)' 
                      : 'Банковские реквизиты трейдера (для получения)'
                    }
                  </label>
                  <select
                    value={formData.trader_payment_method_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, trader_payment_method_id: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    required
                  >
                    <option value="">
                      {formData.order_type === 'buy' 
                        ? 'Выберите криптокошелек' 
                        : 'Выберите банковские реквизиты'
                      }
                    </option>
                    {selectedTrader.payment_methods
                      .filter(pm => pm.is_active && (
                        formData.order_type === 'buy' 
                          ? pm.method_type === 'crypto_wallet'
                          : pm.method_type === 'card'
                      ))
                      .map(method => (
                        <option key={method.id} value={method.id}>
                          {method.display_info}
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}

              {/* Client Payment Type - Auto set based on order type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.order_type === 'buy' 
                    ? 'Банковские реквизиты клиента (для оплаты)' 
                    : 'Криптокошелек клиента (для получения)'
                  }
                </label>
                <div className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-400">
                  {formData.order_type === 'buy' 
                    ? 'Банковская карта (клиент платит)' 
                    : 'Криптокошелек (клиент получает)'
                  }
                </div>
              </div>

              {/* Client Payment Details */}
              {formData.order_type === 'buy' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Банк клиента</label>
                    <input
                      type="text"
                      value={formData.client_bank_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_bank_name: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      required
                      placeholder="Например: Каспий"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Номер карты клиента</label>
                    <input
                      type="text"
                      value={formData.client_card_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_card_number: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      required
                      placeholder="4444 4444 4444 4444"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Владелец карты (имя на карте)</label>
                    <input
                      type="text"
                      value={formData.client_card_holder}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_card_holder: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      required
                      placeholder="Иван Иванов"
                    />
                  </div>

                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Адрес кошелька клиента</label>
                    <input
                      type="text"
                      value={formData.client_wallet_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_wallet_address: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      required
                      placeholder="TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Сеть</label>
                    <select
                      value={formData.client_crypto_network}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_crypto_network: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      required
                    >
                      <option value="TRC20">TRC20</option>
                      <option value="ERC20">ERC20</option>
                      <option value="BEP20">BEP20</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Client Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Имя клиента (для трейдера)</label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  placeholder="Например: Иван Петров"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Примечание</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Создание...</span>
                    </>
                  ) : (
                    <span>Создать заявку</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Edit Order Modal Component
  const EditOrderModal: React.FC<{
    order: Order
    traders: Trader[]
    onClose: () => void
    onSubmit: (data: any) => void
    loading: boolean
  }> = ({ order, traders, onClose, onSubmit, loading }) => {
    const [formData, setFormData] = useState({
      status: order.status,
      commission: order.commission,
      notes: order.notes,
      client_name: order.client_name || '',
      trader_id: order.assigned_trader,
      trader_payment_method_id: order.used_payment_method,
      client_payment_type: order.client_payment_type as 'card' | 'crypto_wallet',
      client_bank_name: order.client_bank_name || '',
      client_card_number: order.client_card_number || '',
      client_card_holder: order.client_card_holder || '',
      client_wallet_address: order.client_wallet_address || '',
      client_crypto_network: order.client_crypto_network || 'TRC20',
      completed_at: order.completed_at ? (() => {
        const date = new Date(order.completed_at)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      })() : ''
    })

    const selectedTrader = traders.find(t => t.user_info.id === formData.trader_id)

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      
      const submitData: any = {
        status: formData.status,
        commission: formData.commission,
        notes: formData.notes,
        client_name: formData.client_name || null,
        trader_id: formData.trader_id,
        trader_payment_method_id: formData.trader_payment_method_id,
        client_payment_type: formData.client_payment_type,
        completed_at: formData.completed_at ? new Date(formData.completed_at).toISOString() : null
      }

      if (formData.client_payment_type === 'card') {
        submitData.client_bank_name = formData.client_bank_name
        submitData.client_card_number = formData.client_card_number
        submitData.client_card_holder = formData.client_card_holder
      } else {
        submitData.client_wallet_address = formData.client_wallet_address
        submitData.client_crypto_network = formData.client_crypto_network
      }

      onSubmit(submitData)
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Редактировать заявку #{order.id.slice(0, 8)}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Статус</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  required
                >
                  <option value="pending">Ожидание</option>
                  <option value="in_progress">В обработке</option>
                  <option value="completed">Завершено</option>
                  <option value="cancelled">Отменено</option>
                </select>
              </div>

              {/* Commission */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Комиссия (₸)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.commission}
                  onChange={(e) => setFormData(prev => ({ ...prev, commission: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  placeholder="0.00"
                />
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Имя клиента (для трейдера)</label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  placeholder="Например: Иван Петров"
                />
              </div>

              {/* Completion Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Дата завершения</label>
                <input
                  type="datetime-local"
                  value={formData.completed_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, completed_at: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>

              {/* Trader Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Трейдер</label>
                <select
                  value={formData.trader_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, trader_id: e.target.value, trader_payment_method_id: '' }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  required
                >
                  {traders.map(trader => (
                    <option key={trader.id} value={trader.user_info.id}>
                      {trader.user_info.first_name} {trader.user_info.last_name} ({trader.user_info.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              {selectedTrader && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Способ оплаты трейдера</label>
                  <select
                    value={formData.trader_payment_method_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, trader_payment_method_id: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    required
                  >
                    <option value="">Выберите способ оплаты</option>
                    {selectedTrader.payment_methods.filter(pm => pm.is_active).map(method => (
                      <option key={method.id} value={method.id}>
                        {method.display_info}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Client Payment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Тип оплаты клиента</label>
                <select
                  value={formData.client_payment_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_payment_type: e.target.value as 'card' | 'crypto_wallet' }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  required
                >
                  <option value="card">Банковская карта</option>
                  <option value="crypto_wallet">Криптокошелек</option>
                </select>
              </div>

              {/* Client Payment Details */}
              {formData.client_payment_type === 'card' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Банк клиента</label>
                    <input
                      type="text"
                      value={formData.client_bank_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_bank_name: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Номер карты</label>
                    <input
                      type="text"
                      value={formData.client_card_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_card_number: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Владелец карты (имя на карте)</label>
                    <input
                      type="text"
                      value={formData.client_card_holder}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_card_holder: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      required
                    />
                  </div>

                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Адрес кошелька</label>
                    <input
                      type="text"
                      value={formData.client_wallet_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_wallet_address: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Сеть</label>
                    <select
                      value={formData.client_crypto_network}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_crypto_network: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      required
                    >
                      <option value="TRC20">TRC20</option>
                      <option value="ERC20">ERC20</option>
                      <option value="BEP20">BEP20</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Примечание</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Сохранение...</span>
                    </>
                  ) : (
                    <span>Сохранить изменения</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  } 