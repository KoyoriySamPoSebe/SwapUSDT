import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { apiService, Order, PaymentMethod, OrderMessage } from '../services/api'

export const ClientDashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'payments' | 'new-order'>('orders')
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

  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [orderMessages, setOrderMessages] = useState<OrderMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [chatImages, setChatImages] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [newOrder, setNewOrder] = useState({
    order_type: 'buy' as 'buy' | 'sell',
    amount_usdt: '',
    rate: '',
    payment_method_id: '',
    notes: '',
    new_wallet_address: '',
    new_crypto_network: 'TRC20',
    new_bank_name: '',
    new_card_number: '',
    new_card_holder_name: '',
  })
  const [creatingOrder, setCreatingOrder] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [ordersData, methodsData] = await Promise.all([
        apiService.getClientOrders(),
        apiService.getClientPaymentMethods(),
      ])
      setOrders(ordersData)
      setPaymentMethods(methodsData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const loadRate = async (orderType?: 'buy' | 'sell') => {
    try {
      const rateData = await apiService.getExchangeRate()
      const midRate = parseFloat(rateData.mid_rate)
      const type = orderType || newOrder.order_type
      const adjustedRate = type === 'buy'
        ? (midRate * 1.03).toFixed(2)
        : (midRate * 0.97).toFixed(2)
      setNewOrder(prev => ({ ...prev, rate: adjustedRate }))
    } catch {}
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingOrder(true)
    try {
      let paymentMethodId = newOrder.payment_method_id

      if (!paymentMethodId) {
        if (newOrder.order_type === 'buy' && newOrder.new_wallet_address) {
          const pm = await apiService.addClientPaymentMethod({
            method_type: 'crypto_wallet',
            wallet_address: newOrder.new_wallet_address,
            crypto_network: newOrder.new_crypto_network,
          })
          paymentMethodId = pm.id
        } else if (newOrder.order_type === 'sell' && newOrder.new_card_number) {
          const pm = await apiService.addClientPaymentMethod({
            method_type: 'card',
            bank_name: newOrder.new_bank_name,
            card_number: newOrder.new_card_number,
            card_holder_name: newOrder.new_card_holder_name,
          })
          paymentMethodId = pm.id
        }
      }

      await apiService.createSelfOrder({
        order_type: newOrder.order_type,
        amount_usdt: newOrder.amount_usdt,
        rate: newOrder.rate,
        payment_method_id: paymentMethodId,
        notes: newOrder.notes,
      })
      setNewOrder({ order_type: 'buy', amount_usdt: '', rate: '', payment_method_id: '', notes: '', new_wallet_address: '', new_crypto_network: 'TRC20', new_bank_name: '', new_card_number: '', new_card_holder_name: '' })
      setActiveTab('orders')
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Ошибка создания заявки')
    }
    setCreatingOrder(false)
  }

  const openOrderDetail = async (orderId: string) => {
    try {
      const detail = await apiService.getClientOrderDetail(orderId)
      setSelectedOrder(detail)
      const msgs = await apiService.getClientOrderMessages(orderId)
      setOrderMessages(msgs)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && chatImages.length === 0) || !selectedOrder) return
    setSendingMessage(true)
    try {
      if (chatImages.length > 0) {
        for (const img of chatImages) {
          const msg = await apiService.sendClientOrderMessageWithImage(selectedOrder.id, newMessage, img)
          setOrderMessages(prev => [...prev, msg])
          setNewMessage('')
        }
      } else {
        const msg = await apiService.sendClientOrderMessage(selectedOrder.id, newMessage)
        setOrderMessages(prev => [...prev, msg])
        setNewMessage('')
      }
      setChatImages([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch {
      alert('Ошибка отправки')
    }
    setSendingMessage(false)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const selected = Array.from(files).slice(0, 2)
    setChatImages(selected)
  }

  const handleSubmitReview = async () => {
    if (!selectedOrder) return
    setSubmittingReview(true)
    try {
      const review = await apiService.leaveReview(selectedOrder.id, reviewRating, reviewText)
      setSelectedOrder({ ...selectedOrder, review })
      setReviewText('')
    } catch (err: any) {
      alert(err.message || 'Ошибка')
    }
    setSubmittingReview(false)
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingPayment(true)
    try {
      await apiService.addClientPaymentMethod(newPayment)
      setShowAddPayment(false)
      setNewPayment({ method_type: 'card', bank_name: '', card_number: '', card_holder_name: '', wallet_address: '', crypto_network: 'TRC20' })
      fetchData()
    } catch {
      alert('Ошибка добавления')
    }
    setAddingPayment(false)
  }

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Удалить реквизиты?')) return
    try {
      await apiService.deleteClientPaymentMethod(id)
      fetchData()
    } catch {
      alert('Ошибка удаления')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/20 text-blue-400'
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400'
      case 'completed': return 'bg-green-500/20 text-green-400'
      case 'cancelled': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo.png" alt="SwapUSDT" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-white font-bold text-lg">SwapUSDT</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm hidden sm:block">
              {user?.first_name} {user?.last_name}
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="flex gap-1 bg-gray-800 p-1 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'orders' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Мои заявки
          </button>
          <button
            onClick={() => { setActiveTab('new-order'); loadRate() }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'new-order' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Новая заявка
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'payments' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Реквизиты
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-16">
                <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-3 text-gray-400">У вас пока нет заявок</p>
                <button
                  onClick={() => { setActiveTab('new-order'); loadRate() }}
                  className="mt-4 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-colors"
                >
                  Создать первую заявку
                </button>
              </div>
            ) : (
              orders.map(order => (
                <div
                  key={order.id}
                  onClick={() => openOrderDetail(order.id)}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-5 cursor-pointer hover:border-emerald-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        order.order_type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {order.order_type === 'buy' ? 'Покупка' : 'Продажа'}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status_display}
                      </span>
                    </div>
                    <span className="text-gray-500 text-xs">
                      {new Date(order.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white text-xl font-semibold">{parseFloat(order.amount_usdt).toLocaleString('ru-RU')} USDT</span>
                    <span className="text-gray-500">×</span>
                    <span className="text-gray-400">{parseFloat(order.rate).toLocaleString('ru-RU')} ₸</span>
                    <span className="text-gray-500">=</span>
                    <span className="text-emerald-400 font-medium">{parseFloat(order.amount_kzt).toLocaleString('ru-RU')} ₸</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* New Order Tab */}
        {activeTab === 'new-order' && (
          <div className="max-w-md mx-auto">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-5">Создать заявку</h2>
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setNewOrder({ ...newOrder, order_type: 'buy', payment_method_id: '' }); loadRate('buy') }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      newOrder.order_type === 'buy' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Купить USDT
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewOrder({ ...newOrder, order_type: 'sell', payment_method_id: '' }); loadRate('sell') }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      newOrder.order_type === 'sell' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Продать USDT
                  </button>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Сумма (USDT)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="100"
                    value={newOrder.amount_usdt}
                    onChange={(e) => setNewOrder({ ...newOrder, amount_usdt: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Курс (KZT за 1 USDT)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrder.rate}
                    onChange={(e) => setNewOrder({ ...newOrder, rate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500"
                    required
                  />
                </div>

                {newOrder.amount_usdt && newOrder.rate && (
                  <div className="p-3 bg-gray-700/50 rounded-xl text-center">
                    <span className="text-gray-400 text-sm">Итого: </span>
                    <span className="text-white font-semibold text-lg">
                      {(parseFloat(newOrder.amount_usdt) * parseFloat(newOrder.rate)).toLocaleString('ru-RU')} ₸
                    </span>
                  </div>
                )}

                {(() => {
                  const filtered = paymentMethods.filter(pm =>
                    newOrder.order_type === 'buy' ? pm.method_type === 'crypto_wallet' : pm.method_type === 'card'
                  )
                  return (
                    <div className="space-y-3">
                      <label className="block text-sm text-gray-400">
                        {newOrder.order_type === 'buy' ? 'Кошелёк для получения USDT' : 'Карта для получения KZT'}
                      </label>
                      {filtered.length > 0 && (
                        <select
                          value={newOrder.payment_method_id}
                          onChange={(e) => setNewOrder({ ...newOrder, payment_method_id: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white"
                        >
                          <option value="">Ввести новые</option>
                          {filtered.map(pm => (
                            <option key={pm.id} value={pm.id}>
                              {pm.method_type === 'card' ? `💳 ${pm.bank_name} ****${pm.card_number?.slice(-4)}` : `🪙 ${pm.crypto_network} ${pm.wallet_address?.slice(0, 12)}...`}
                            </option>
                          ))}
                        </select>
                      )}
                      {!newOrder.payment_method_id && newOrder.order_type === 'buy' && (
                        <div className="space-y-2">
                          <select
                            value={newOrder.new_crypto_network}
                            onChange={(e) => setNewOrder({ ...newOrder, new_crypto_network: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white"
                          >
                            <option value="TRC20">TRC20</option>
                            <option value="ERC20">ERC20</option>
                            <option value="BEP20">BEP20</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Адрес кошелька"
                            value={newOrder.new_wallet_address}
                            onChange={(e) => setNewOrder({ ...newOrder, new_wallet_address: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500"
                            required={!newOrder.payment_method_id}
                          />
                        </div>
                      )}
                      {!newOrder.payment_method_id && newOrder.order_type === 'sell' && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Название банка"
                            value={newOrder.new_bank_name}
                            onChange={(e) => setNewOrder({ ...newOrder, new_bank_name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500"
                            required={!newOrder.payment_method_id}
                          />
                          <input
                            type="text"
                            placeholder="Номер карты"
                            value={newOrder.new_card_number}
                            onChange={(e) => setNewOrder({ ...newOrder, new_card_number: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500"
                            required={!newOrder.payment_method_id}
                          />
                          <input
                            type="text"
                            placeholder="Имя держателя"
                            value={newOrder.new_card_holder_name}
                            onChange={(e) => setNewOrder({ ...newOrder, new_card_holder_name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500"
                            required={!newOrder.payment_method_id}
                          />
                        </div>
                      )}
                      {!newOrder.payment_method_id && (
                        <p className="text-xs text-gray-500">Реквизиты сохранятся в вашем ЛК</p>
                      )}
                    </div>
                  )
                })()}

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Комментарий</label>
                  <input
                    type="text"
                    placeholder="Необязательно"
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingOrder}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
                >
                  {creatingOrder ? 'Создание...' : 'Создать заявку'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddPayment(true)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                + Добавить
              </button>
            </div>

            {paymentMethods.length === 0 ? (
              <div className="text-center py-16">
                <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <p className="mt-3 text-gray-400">Нет добавленных реквизитов</p>
                <button
                  onClick={() => setShowAddPayment(true)}
                  className="mt-4 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-colors"
                >
                  Добавить реквизиты
                </button>
              </div>
            ) : (
              paymentMethods.map(pm => (
                <div key={pm.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                      pm.method_type === 'card' ? 'bg-blue-500' : 'bg-orange-500'
                    }`}>
                      {pm.method_type === 'card' ? '💳' : '🪙'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{pm.method_type_display}</p>
                      <p className="text-gray-400 text-sm">
                        {pm.method_type === 'card'
                          ? `${pm.bank_name} ****${pm.card_number?.slice(-4)}`
                          : `${pm.crypto_network} ${pm.wallet_address?.slice(0, 12)}...`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePayment(pm.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-5 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-semibold text-white">Заявка</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Order info */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  selectedOrder.order_type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                }`}>
                  {selectedOrder.order_type === 'buy' ? 'Покупка USDT' : 'Продажа USDT'}
                </span>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                  {selectedOrder.status_display}
                </span>
              </div>

              <div className="bg-gray-700/50 rounded-xl p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-gray-400 text-xs">Сумма</p>
                    <p className="text-white font-semibold">{parseFloat(selectedOrder.amount_usdt).toLocaleString('ru-RU')} USDT</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Курс</p>
                    <p className="text-white font-semibold">{parseFloat(selectedOrder.rate).toLocaleString('ru-RU')} ₸</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Итого</p>
                    <p className="text-emerald-400 font-semibold">{parseFloat(selectedOrder.amount_kzt).toLocaleString('ru-RU')} ₸</p>
                  </div>
                </div>
              </div>

              {/* Trader info */}
              {selectedOrder.trader_info && (
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-2">Трейдер</p>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">
                      {selectedOrder.trader_info.first_name} {selectedOrder.trader_info.last_name}
                    </span>
                    <div className="flex items-center gap-2">
                      {selectedOrder.trader_info.avg_rating && (
                        <span className="flex items-center gap-1 text-yellow-400 text-sm">
                          ★ {selectedOrder.trader_info.avg_rating}
                        </span>
                      )}
                      <span className="text-gray-500 text-xs">
                        ({selectedOrder.trader_info.reviews_count} отзывов)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Review section */}
              {selectedOrder.status === 'completed' && (
                <div className="bg-gray-700/50 rounded-xl p-4">
                  {selectedOrder.review ? (
                    <div>
                      <p className="text-gray-400 text-xs mb-2">Ваш отзыв</p>
                      <div className="flex items-center gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <span key={s} className={s <= selectedOrder.review.rating ? 'text-yellow-400' : 'text-gray-600'}>★</span>
                        ))}
                      </div>
                      {selectedOrder.review.text && <p className="text-gray-300 text-sm">{selectedOrder.review.text}</p>}
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-400 text-xs mb-3">Оставить отзыв</p>
                      <div className="flex items-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setReviewRating(s)}
                            className={`text-2xl transition-colors ${s <= reviewRating ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400/50'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Комментарий (необязательно)"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 mb-3"
                      />
                      <button
                        onClick={handleSubmitReview}
                        disabled={submittingReview}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {submittingReview ? 'Отправка...' : 'Отправить отзыв'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Chat */}
              {selectedOrder.assigned_trader_info && (
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-3">Чат по заявке</p>
                  <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
                    {orderMessages.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">Сообщений пока нет</p>
                    ) : (
                      orderMessages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                            msg.sender === user?.id
                              ? 'bg-emerald-500/20 text-emerald-100'
                              : 'bg-gray-600 text-gray-200'
                          }`}>
                            {msg.image_url && (
                              <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                                <img src={msg.image_url} alt="Чек" className="max-w-full max-h-40 rounded mb-1 cursor-pointer hover:opacity-80" />
                              </a>
                            )}
                            {msg.text && <p>{msg.text}</p>}
                            <span className="text-[10px] text-gray-500 mt-1 block">
                              {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  {chatImages.length > 0 && (
                    <div className="flex gap-2 mb-2">
                      {chatImages.map((img, i) => (
                        <div key={i} className="relative">
                          <img src={URL.createObjectURL(img)} alt="" className="h-16 w-16 object-cover rounded border border-gray-600" />
                          <button
                            type="button"
                            onClick={() => setChatImages(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Сообщение..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
                      title="Прикрепить фото (макс. 2)"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    <button
                      type="submit"
                      disabled={sendingMessage || (!newMessage.trim() && chatImages.length === 0)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                    >
                      →
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                  <input type="text" placeholder="Название банка" value={newPayment.bank_name}
                    onChange={(e) => setNewPayment({ ...newPayment, bank_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500" required />
                  <input type="text" placeholder="Номер карты" value={newPayment.card_number}
                    onChange={(e) => setNewPayment({ ...newPayment, card_number: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500" required />
                  <input type="text" placeholder="Имя держателя" value={newPayment.card_holder_name}
                    onChange={(e) => setNewPayment({ ...newPayment, card_holder_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500" required />
                </>
              ) : (
                <>
                  <select value={newPayment.crypto_network}
                    onChange={(e) => setNewPayment({ ...newPayment, crypto_network: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white">
                    <option value="TRC20">TRC20</option>
                    <option value="ERC20">ERC20</option>
                    <option value="BEP20">BEP20</option>
                  </select>
                  <input type="text" placeholder="Адрес кошелька" value={newPayment.wallet_address}
                    onChange={(e) => setNewPayment({ ...newPayment, wallet_address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500" required />
                </>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddPayment(false)}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors">
                  Отмена
                </button>
                <button type="submit" disabled={addingPayment}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-colors">
                  {addingPayment ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
