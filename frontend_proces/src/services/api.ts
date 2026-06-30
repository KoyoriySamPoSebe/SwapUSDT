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

const API_BASE_URL = 'http://localhost:8001/api'

class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token')
    return {
      'Authorization': token || '',
      'accept': 'application/json',
      'Content-Type': 'application/json',
    }
  }

  async getTraders(): Promise<Trader[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/traders/`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching traders:', error)
      throw error
    }
  }

  async searchTraders(query: string): Promise<Trader[]> {
    try {
      if (query.length < 2) {
        return []
      }

      const response = await fetch(`${API_BASE_URL}/admin/search-traders/?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error searching traders:', error)
      throw error
    }
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
    try {
      const response = await fetch(`${API_BASE_URL}/admin/add-payment-method/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error adding payment method:', error)
      throw error
    }
  }

  async createTrader(traderData: {
    first_name: string
    last_name: string
    patronymic_name?: string
    phone: string
    password: string
    deposit_amount: string
  }): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/create-trader/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(traderData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Ошибка при создании трейдера')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating trader:', error)
      throw error
    }
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/payment-methods/${paymentMethodId}/delete/`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
    } catch (error) {
      console.error('Error deleting payment method:', error)
      throw error
    }
  }

  async togglePaymentMethod(paymentMethodId: string, isActive: boolean): Promise<PaymentMethod> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/payment-methods/${paymentMethodId}/toggle/`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ is_active: isActive }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error toggling payment method:', error)
      throw error
    }
  }

  async getAllOrders(): Promise<Order[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching orders:', error)
      throw error
    }
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
    try {
      const response = await fetch(`${API_BASE_URL}/orders/create-for-trader/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(orderData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Ошибка при создании заявки')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating order:', error)
      throw error
    }
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
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/admin-update/`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Ошибка при обновлении заявки')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating order:', error)
      throw error
    }
  }

  async getTradersAnalytics(): Promise<TraderAnalytics[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/traders-analytics/`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching traders analytics:', error)
      throw error
    }
  }

  async getAdminAnalytics(): Promise<AdminAnalytics> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/analytics/`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching admin analytics:', error)
      throw error
    }
  }

  async updateTraderOnlineStatus(isOnline: boolean): Promise<{ is_online: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/trader/update-online-status/`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ is_online: isOnline }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Ошибка при обновлении статуса')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating online status:', error)
      throw error
    }
  }

  async getTraderDashboard(): Promise<TraderDashboard> {
    try {
      const response = await fetch(`${API_BASE_URL}/trader/dashboard/`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Ошибка при загрузке дашборда')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching trader dashboard:', error)
      throw error
    }
  }

  async getTraderOrders(): Promise<TraderOrder[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/trader-orders/`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Ошибка при загрузке заявок')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching trader orders:', error)
      throw error
    }
  }

  async updateTraderOrderStatus(orderId: string, status: string, commission?: string): Promise<TraderOrder> {
    try {
      const body: any = { status }
      
      // Если статус "completed", добавляем комиссию
      if (status === 'completed' && commission) {
        body.commission = commission
      }

      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/update-trader-status/`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Ошибка при обновлении статуса заявки')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating trader order status:', error)
      throw error
    }
  }
}

export const apiService = new ApiService()
export type { Trader, User, PaymentMethod, Order, TraderAnalytics, AdminAnalytics, TraderDashboard, TraderOrder } 