import React, { useState } from 'react'
import { Trader, PaymentMethod, apiService } from '../services/api'

interface TraderDetailSliderProps {
  trader: Trader | null
  isOpen: boolean
  onClose: () => void
  onPaymentMethodAdded: (traderId: string, paymentMethod: PaymentMethod) => void
}

interface PaymentMethodForm {
  method_type: 'card' | 'crypto_wallet'
  bank_name: string
  card_number: string
  card_holder_name: string
  wallet_address: string
  crypto_network: string
}

export const TraderDetailSlider: React.FC<TraderDetailSliderProps> = ({
  trader,
  isOpen,
  onClose,
  onPaymentMethodAdded
}) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingActions, setLoadingActions] = useState<{[key: string]: boolean}>({})
  const [formData, setFormData] = useState<PaymentMethodForm>({
    method_type: 'card',
    bank_name: '',
    card_number: '',
    card_holder_name: '',
    wallet_address: '',
    crypto_network: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleMethodTypeChange = (type: 'card' | 'crypto_wallet') => {
    setFormData(prev => ({ ...prev, method_type: type }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trader) return

    setIsLoading(true)
    setError(null)

    try {
      const data: any = {
        trader_id: trader.user_info.id,
        method_type: formData.method_type
      }

      if (formData.method_type === 'card') {
        data.bank_name = formData.bank_name
        data.card_number = formData.card_number
        data.card_holder_name = formData.card_holder_name
      } else {
        data.wallet_address = formData.wallet_address
        data.crypto_network = formData.crypto_network
      }

      const newPaymentMethod = await apiService.addPaymentMethod(data)
      onPaymentMethodAdded(trader.id, newPaymentMethod)
      
      // Сброс формы
      setFormData({
        method_type: 'card',
        bank_name: '',
        card_number: '',
        card_holder_name: '',
        wallet_address: '',
        crypto_network: ''
      })
      setShowAddForm(false)
    } catch (err) {
      setError('Ошибка при добавлении способа оплаты')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
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

  const handleTogglePaymentMethod = async (paymentMethodId: string, currentStatus: boolean) => {
    if (!trader) return
    
    setLoadingActions(prev => ({ ...prev, [paymentMethodId]: true }))
    
    try {
      const updatedMethod = await apiService.togglePaymentMethod(paymentMethodId, !currentStatus)
      
      // Просто перезагружаем страницу для корректного обновления
      window.location.reload()
      
    } catch (error) {
      console.error('Error toggling payment method:', error)
      setError('Ошибка при изменении статуса способа оплаты')
    } finally {
      setLoadingActions(prev => ({ ...prev, [paymentMethodId]: false }))
    }
  }

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!trader) return
    
    if (!confirm('Вы уверены, что хотите удалить этот способ оплаты?')) {
      return
    }
    
    setLoadingActions(prev => ({ ...prev, [`delete_${paymentMethodId}`]: true }))
    
    try {
      await apiService.deletePaymentMethod(paymentMethodId)
      
      // Обновляем локальное состояние, удаляя способ оплаты
      const updatedTrader = {
        ...trader,
        payment_methods: trader.payment_methods.filter(method => method.id !== paymentMethodId)
      }
      
      // Принудительно обновляем родительский компонент
      window.location.reload()
      
    } catch (error) {
      console.error('Error deleting payment method:', error)
      setError('Ошибка при удалении способа оплаты')
    } finally {
      setLoadingActions(prev => ({ ...prev, [`delete_${paymentMethodId}`]: false }))
    }
  }

  if (!isOpen || !trader) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Slider */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-gray-900/95 backdrop-blur-lg border-l border-gray-700/50 z-50 transform transition-transform duration-300 overflow-y-auto ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="relative p-8 border-b border-gray-700/50 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-white">Детали трейдера</h2>
            <button
              onClick={onClose}
              className="p-3 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Trader Avatar & Basic Info */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">
                  {trader.user_info.first_name.charAt(0)}{trader.user_info.last_name.charAt(0)}
                </span>
              </div>
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-gray-900 ${
                trader.user_info.is_blocked ? 'bg-red-500' : 'bg-green-500'
              }`}></div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2">
                {trader.user_info.first_name} {trader.user_info.last_name}
                {trader.user_info.patronymic_name && ` ${trader.user_info.patronymic_name}`}
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <span className={`px-3 py-1 rounded-full font-medium ${
                  trader.user_info.is_blocked 
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                    : 'bg-green-500/20 text-green-300 border border-green-500/30'
                }`}>
                  {trader.user_info.is_blocked ? 'Заблокирован' : 'Активен'}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-blue-400 font-medium">{trader.user_info.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-600/10 to-blue-800/10 border border-blue-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <span className="text-gray-400 text-sm">Депозит</span>
              </div>
              <div className="text-2xl font-bold text-white">{formatAmount(trader.deposit_amount)}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-600/10 to-purple-800/10 border border-purple-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <span className="text-gray-400 text-sm">Способы оплаты</span>
              </div>
              <div className="text-2xl font-bold text-white">{trader.payment_methods.length}</div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Контактная информация
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Телефон:</span>
                <span className="text-white font-medium">{trader.user_info.phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">ID:</span>
                <span className="text-white font-mono text-sm">{trader.user_info.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Дата регистрации:</span>
                <span className="text-white">{formatDate(trader.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Способы оплаты
              </h4>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Добавить
              </button>
            </div>

            {/* Payment Methods List */}
            <div className="space-y-4 mb-6">
              {trader.payment_methods.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <p>Способы оплаты не добавлены</p>
                </div>
              ) : (
                                 trader.payment_methods.map((method) => (
                   <div key={method.id} className="bg-gray-700/50 border border-gray-600/50 rounded-xl p-4">
                     <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                           method.method_type === 'card' 
                             ? 'bg-blue-500/20 text-blue-400' 
                             : 'bg-orange-500/20 text-orange-400'
                         }`}>
                           {method.method_type === 'card' ? (
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                             </svg>
                           ) : (
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                             </svg>
                           )}
                         </div>
                         <div>
                           <h5 className="font-medium text-white">
                             {method.method_type_display}
                             {method.method_type === 'card' && method.card_number && (
                               <span className="ml-2 text-gray-400">•••• {method.card_number.slice(-4)}</span>
                             )}
                           </h5>
                           <p className="text-sm text-gray-400">{method.display_info}</p>
                         </div>
                       </div>
                       
                       <div className="flex items-center gap-2">
                         <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                           method.is_active 
                             ? 'bg-green-500/20 text-green-300' 
                             : 'bg-red-500/20 text-red-300'
                         }`}>
                           {method.is_active ? 'Активен' : 'Неактивен'}
                         </span>
                         
                         {/* Action buttons */}
                         <div className="flex items-center gap-1">
                           <button
                             onClick={() => handleTogglePaymentMethod(method.id, method.is_active)}
                             disabled={loadingActions[method.id]}
                             className={`p-1.5 rounded-lg transition-colors ${
                               method.is_active
                                 ? 'text-red-400 hover:bg-red-400/10'
                                 : 'text-green-400 hover:bg-green-400/10'
                             } disabled:opacity-50`}
                             title={method.is_active ? 'Деактивировать' : 'Активировать'}
                           >
                             {loadingActions[method.id] ? (
                               <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                               </svg>
                             ) : method.is_active ? (
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                               </svg>
                             ) : (
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                               </svg>
                             )}
                           </button>
                           
                           <button
                             onClick={() => handleDeletePaymentMethod(method.id)}
                             disabled={loadingActions[`delete_${method.id}`]}
                             className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                             title="Удалить"
                           >
                             {loadingActions[`delete_${method.id}`] ? (
                               <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                               </svg>
                             ) : (
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                               </svg>
                             )}
                           </button>
                         </div>
                       </div>
                     </div>
                     <div className="text-xs text-gray-500">
                       Добавлен: {formatDate(method.created_at)}
                     </div>
                   </div>
                 ))
              )}
            </div>

            {/* Add Payment Method Form */}
            {showAddForm && (
              <div className="bg-gray-900/50 border border-gray-600/50 rounded-xl p-6 mt-6">
                <h5 className="text-lg font-medium text-white mb-4">Добавить способ оплаты</h5>
                
                {/* Method Type Selector */}
                <div className="flex gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => handleMethodTypeChange('card')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                      formData.method_type === 'card'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Банковская карта
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMethodTypeChange('crypto_wallet')}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                      formData.method_type === 'crypto_wallet'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Криптокошелек
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {formData.method_type === 'card' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Название банка
                        </label>
                        <input
                          type="text"
                          name="bank_name"
                          value={formData.bank_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Kaspi Bank"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Номер карты
                        </label>
                        <input
                          type="text"
                          name="card_number"
                          value={formData.card_number}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="4444 4444 4444 4444"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Держатель карты
                        </label>
                        <input
                          type="text"
                          name="card_holder_name"
                          value={formData.card_holder_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="PETR PETROV"
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Адрес кошелька
                        </label>
                        <input
                          type="text"
                          name="wallet_address"
                          value={formData.wallet_address}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Сеть
                        </label>
                        <input
                          type="text"
                          name="crypto_network"
                          value={formData.crypto_network}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="TRC20"
                          required
                        />
                      </div>
                    </>
                  )}

                  {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Добавление...
                        </>
                      ) : (
                        'Добавить'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
} 