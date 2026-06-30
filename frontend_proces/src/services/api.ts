import { API_BASE_URL } from '../config'

interface User {
  id: string
  first_name: string
  last_name: string
  patronymic_name: string | null
  phone: string
  avatar: string | null
  birthday: string | null
  role: string
  is_blocked: boolean
  is_online?: boolean
}

interface PaymentMethod {
  id: string
  method_type: string
  method_type_display: string
  bank_name: string | null
  card_number: string | null
  card_holder_name: string | null
  wallet_address: string | null
  crypto_network: string | null
  is_active: boolean
  display_info: string
  created_at: string
  updated_at: string
}

interface Order {
  id: string
  order_type: string
  order_type_display: string
  amount_usdt: string
  rate: string
  amount_kzt: string
  status: string
  status_display: string
  created_by: string
  created_by_info?: User
  assigned_trader: string
  assigned_trader_info: User
  used_payment_method: string
  used_payment_method_info: PaymentMethod
  client_name: string | null
  trader_payment_type: string
  trader_bank_name: string | null
  trader_card_number: string | null
  trader_card_holder: string | null
  trader_wallet_address: string | null
  trader_crypto_network: string | null
  client_payment_type: string
  client_bank_name: string | null
  client_card_number: string | null
  client_card_holder: string | null
  client_wallet_address: string | null
  client_crypto_network: string | null
  trader_payment_info: string
  client_payment_info: string
  payment_info: string
  created_at: string
  updated_at: string
  completed_at: string | null
  notes: string
  commission: string
}

interface TraderAnalytics {
  trader_info: User
  total_orders: number
  completed_orders: number
  cancelled_orders: number
  in_progress_orders: number
  success_rate: string
  total_volume_usdt: string
  total_volume_kzt: string
  completed_volume_usdt: string
  completed_volume_kzt: string
  total_commission: string
  buy_orders_count: number
  sell_orders_count: number
  buy_volume_usdt: string
  sell_volume_usdt: string
  today_stats: {
    orders_count: number
    volume_usdt: number
    commission: number
  }
  week_stats: {
    orders_count: number
    volume_usdt: number
    commission: number
  }
  month_stats: {
    orders_count: number
    volume_usdt: number
    commission: number
  }
  deposit_amount: string
  last_order_date: string | null
  avg_orders_per_day: string
}

interface AdminAnalytics {
  total_orders: number
  completed_orders: number
  cancelled_orders: number
  in_progress_orders: number
  new_orders: number
  success_rate: string
  total_volume_usdt: string
  total_volume_kzt: string
  completed_volume_usdt: string
  completed_volume_kzt: string
  buy_orders_count: number
  sell_orders_count: number
  buy_volume_usdt: string
  sell_volume_usdt: string
  total_traders: number
  active_traders: number
  blocked_traders: number
  online_traders: number
  top_traders: any[]
  today_orders: number
  month_orders: number
  today_volume_usdt: string
  week_volume_usdt: string
  month_volume_usdt: string
}

interface TraderDashboard {
  week_stats: {
    orders_count: number
    total_earned: number
    total_volume_usdt: number
  }
  month_stats: {
    orders_count: number
    total_earned: number
    total_volume_usdt: number
  }
  trader_profile: {
    id: string
    user_info: User
    deposit_amount: string
    payment_methods: PaymentMethod[]
    total_commission: number
    created_at: string
    updated_at: string
  }
}

interface TraderOrder {
  id: string
  order_type: string
  order_type_display: string
  amount_usdt: string
  rate: string
  amount_kzt: string
  status: string
  status_display: string
  client_name: string
  created_by_info?: User
  used_payment_method_info: PaymentMethod
  trader_payment_info: string
  client_payment_info: string
  created_at: string
  completed_at?: string
  notes: string
}

interface Trader {
  id: string
  user_info: User
  deposit_amount: string
  payment_methods: PaymentMethod[]
  created_at: string
  updated_at: string
}

interface OrderMessage {
  id: string
  order: string
  sender: string
  sender_info: User
  text: string
  image_url: string | null
  created_at: string
}

interface SupportMessage {
  id: string
  user: string
  sender: string
  sender_info: User
  text: string
  is_read: boolean
  created_at: string
}

interface SupportThread {
  user_info: User
  last_message: string
  last_message_at: string
  unread_count: number
  total_messages: number
}


class ApiService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('access_token')
    return {
      'Authorization': token || '',
      'accept': 'application/json',
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(
    endpoint: string,
    options: { method?: string; body?: unknown; withAuth?: boolean } = {}
  ): Promise<T> {
    const { method = 'GET', body, withAuth = true } = options
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: withAuth ? this.getAuthHeaders() : { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `HTTP error: ${response.status}`)
    }
    if (response.status === 204) return undefined as T
    return response.json()
  }

  async getTraders(): Promise<Trader[]> {
    return this.request('/admin/traders/')
  }

  async searchTraders(query: string): Promise<Trader[]> {
    if (query.length < 2) return []
    return this.request(`/admin/search-traders/?query=${encodeURIComponent(query)}`)
  }

  async addPaymentMethod(data: {
    trader_id: string
    method_type: 'card' | 'crypto_wallet'
    bank_name?: string
    card_number?: string
    card_holder_name?: string
    wallet_address?: string
    crypto_network?: string
  }): Promise<PaymentMethod> {
    return this.request('/admin/add-payment-method/', { method: 'POST', body: data })
  }

  async createTrader(traderData: {
    first_name: string
    last_name: string
    patronymic_name?: string
    phone: string
    password: string
    deposit_amount: string
  }): Promise<User> {
    return this.request('/admin/create-trader/', { method: 'POST', body: traderData })
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    return this.request(`/admin/payment-methods/${paymentMethodId}/delete/`, { method: 'DELETE' })
  }

  async togglePaymentMethod(paymentMethodId: string, isActive: boolean): Promise<PaymentMethod> {
    return this.request(`/admin/payment-methods/${paymentMethodId}/toggle/`, { method: 'PATCH', body: { is_active: isActive } })
  }

  async getAllOrders(): Promise<Order[]> {
    return this.request('/orders/')
  }

  async createOrder(orderData: {
    order_type: 'buy' | 'sell'
    amount_usdt: string
    rate: string
    trader_id: string
    trader_payment_method_id: string
    notes: string
    client_payment_type: 'card' | 'crypto_wallet'
    client_bank_name?: string
    client_card_number?: string
    client_card_holder?: string
    client_wallet_address?: string
    client_crypto_network?: string
  }): Promise<Order> {
    return this.request('/orders/create-for-trader/', { method: 'POST', body: orderData })
  }

  async updateOrder(orderId: string, updateData: {
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    commission?: string
    notes?: string
    trader_id?: string
    trader_payment_method_id?: string
    client_payment_type?: 'card' | 'crypto_wallet'
    client_bank_name?: string
    client_card_number?: string
    client_card_holder?: string
    client_wallet_address?: string
    client_crypto_network?: string
    completed_at?: string
  }): Promise<Order> {
    return this.request(`/orders/${orderId}/admin-update/`, { method: 'PATCH', body: updateData })
  }

  async getTradersAnalytics(): Promise<TraderAnalytics[]> {
    return this.request('/admin/traders-analytics/')
  }

  async getAdminAnalytics(): Promise<AdminAnalytics> {
    return this.request('/admin/analytics/')
  }

  async updateTraderOnlineStatus(isOnline: boolean): Promise<{ is_online: boolean }> {
    return this.request('/trader/update-online-status/', { method: 'PATCH', body: { is_online: isOnline } })
  }

  async getTraderDashboard(): Promise<TraderDashboard> {
    return this.request('/trader/dashboard/')
  }

  async addTraderPaymentMethod(data: {
    method_type: 'card' | 'crypto_wallet'
    bank_name?: string
    card_number?: string
    card_holder_name?: string
    wallet_address?: string
    crypto_network?: string
  }): Promise<PaymentMethod> {
    return this.request('/trader/add-payment-method/', { method: 'POST', body: data })
  }

  async deleteTraderPaymentMethod(id: string): Promise<void> {
    return this.request(`/trader/payment-methods/${id}/delete/`, { method: 'DELETE' })
  }

  async getExchangeRate(): Promise<{ pair: string; buy_rate: string; sell_rate: string; mid_rate: string; updated_at: string }> {
    return this.request('/exchange/rate/', { withAuth: false })
  }

  async getClientOrders(): Promise<Order[]> {
    return this.request('/client/orders/')
  }

  async getClientPaymentMethods(): Promise<PaymentMethod[]> {
    return this.request('/client/payment-methods/')
  }

  async addClientPaymentMethod(data: {
    method_type: 'card' | 'crypto_wallet'
    bank_name?: string
    card_number?: string
    card_holder_name?: string
    wallet_address?: string
    crypto_network?: string
  }): Promise<PaymentMethod> {
    return this.request('/client/add-payment-method/', { method: 'POST', body: data })
  }

  async deleteClientPaymentMethod(id: string): Promise<void> {
    return this.request(`/client/payment-methods/${id}/delete/`, { method: 'DELETE' })
  }

  async getClientOrderDetail(orderId: string): Promise<any> {
    return this.request(`/client/orders/${orderId}/`)
  }

  async leaveReview(orderId: string, rating: number, text: string): Promise<any> {
    return this.request(`/client/orders/${orderId}/review/`, { method: 'POST', body: { rating, text } })
  }

  async getClientOrderMessages(orderId: string): Promise<OrderMessage[]> {
    return this.request(`/client/orders/${orderId}/messages/`)
  }

  async sendClientOrderMessage(orderId: string, text: string): Promise<OrderMessage> {
    return this.request(`/client/orders/${orderId}/messages/send/`, { method: 'POST', body: { text } })
  }

  async sendClientOrderMessageWithImage(orderId: string, text: string, image: File): Promise<OrderMessage> {
    const formData = new FormData()
    if (text) formData.append('text', text)
    formData.append('image', image)
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/client/orders/${orderId}/messages/send/`, {
      method: 'POST',
      headers: { 'Authorization': token || '' },
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Ошибка загрузки')
    }
    return res.json()
  }

  async createSelfOrder(data: {
    order_type: 'buy' | 'sell'
    amount_usdt: string
    rate: string
    payment_method_id?: string
    notes?: string
  }): Promise<Order> {
    return this.request('/orders/create-self/', { method: 'POST', body: data })
  }

  async getTraderOrders(): Promise<TraderOrder[]> {
    return this.request('/orders/trader-orders/')
  }

  async updateTraderOrderStatus(orderId: string, status: string, commission?: string): Promise<TraderOrder> {
    const body: Record<string, string> = { status }
    if (status === 'completed' && commission) body.commission = commission
    return this.request(`/orders/${orderId}/update-trader-status/`, { method: 'PATCH', body })
  }

  async getOrderMessages(orderId: string): Promise<OrderMessage[]> {
    return this.request(`/orders/${orderId}/messages/`)
  }

  async sendOrderMessage(orderId: string, text: string): Promise<OrderMessage> {
    return this.request(`/orders/${orderId}/messages/send/`, { method: 'POST', body: { text } })
  }

  async sendOrderMessageWithImage(orderId: string, text: string, image: File): Promise<OrderMessage> {
    const formData = new FormData()
    if (text) formData.append('text', text)
    formData.append('image', image)
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/messages/send/`, {
      method: 'POST',
      headers: { 'Authorization': token || '' },
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Ошибка загрузки')
    }
    return res.json()
  }

  async getSupportMessages(): Promise<SupportMessage[]> {
    return this.request('/support/messages/')
  }

  async getSupportTelegramInfo(): Promise<{ bot_url: string | null; is_configured: boolean; is_linked: boolean }> {
    return this.request('/support/telegram-info/')
  }

  async sendSupportMessage(text: string): Promise<SupportMessage> {
    return this.request('/support/messages/send/', { method: 'POST', body: { text } })
  }

  async getSupportUnreadCount(): Promise<{ unread_count: number }> {
    return this.request('/support/unread-count/')
  }

  async getSupportThreads(): Promise<SupportThread[]> {
    return this.request('/support/threads/')
  }

  async getSupportThreadMessages(userId: string): Promise<SupportMessage[]> {
    return this.request(`/support/thread/?user_id=${userId}`)
  }

  async replySupportMessage(userId: string, text: string): Promise<SupportMessage> {
    return this.request('/support/reply/', { method: 'POST', body: { user_id: userId, text } })
  }
}

export const apiService = new ApiService()
export type { Trader, User, PaymentMethod, Order, TraderAnalytics, AdminAnalytics, TraderDashboard, TraderOrder, OrderMessage, SupportMessage, SupportThread } 