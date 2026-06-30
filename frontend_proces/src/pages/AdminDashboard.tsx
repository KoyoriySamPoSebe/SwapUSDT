import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { apiService, TraderAnalytics, AdminAnalytics } from '../services/api'
import { API_BASE_URL } from '../config'

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<TraderAnalytics[]>([])
  const [adminAnalytics, setAdminAnalytics] = useState<AdminAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const [tradersData, adminData] = await Promise.all([
          apiService.getTradersAnalytics(),
          apiService.getAdminAnalytics()
        ])
        setAnalytics(tradersData)
        setAdminAnalytics(adminData)
      } catch (err) {
        setError('Ошибка при загрузке аналитики')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  const formatAmount = (amount: string | number) => {
    return parseFloat(amount.toString()).toLocaleString('ru-RU')
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Нет данных'
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Use admin analytics data
  if (!adminAnalytics) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    )
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
      <div className="p-6 w-full">
        {/* Header */}
        <div className="mb-8 animate-fadeIn flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 hover:text-blue-400 transition-colors duration-300">Административная панель</h1>
            <p className="text-gray-400">Аналитика трейдеров и общая статистика</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const token = localStorage.getItem('access_token')
                const resp = await fetch(`${API_BASE_URL}/admin/export-orders/?format=csv`, {
                  headers: { 'Authorization': token || '' }
                })
                const blob = await resp.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'orders_export.csv'
                a.click()
                window.URL.revokeObjectURL(url)
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Выгрузить CSV
            </button>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:scale-105 group animate-fadeIn cursor-pointer" style={{animationDelay: '100ms'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-600 bg-opacity-20 group-hover:bg-opacity-30 group-hover:scale-110 transition-all duration-300">
                <svg className="w-6 h-6 text-blue-400 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors duration-300 animate-counterUp">{adminAnalytics.total_orders}</h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Всего заявок</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 hover:border-green-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10 hover:scale-105 group animate-fadeIn cursor-pointer" style={{animationDelay: '200ms'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-600 bg-opacity-20 group-hover:bg-opacity-30 group-hover:scale-110 transition-all duration-300">
                <svg className="w-6 h-6 text-green-400 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-white group-hover:text-green-400 transition-colors duration-300 animate-counterUp">{adminAnalytics.completed_orders}</h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Завершено</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/10 hover:scale-105 group animate-fadeIn cursor-pointer" style={{animationDelay: '300ms'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-600 bg-opacity-20 group-hover:bg-opacity-30 group-hover:scale-110 transition-all duration-300">
                <svg className="w-6 h-6 text-yellow-400 group-hover:animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-white group-hover:text-yellow-400 transition-colors duration-300 animate-counterUp">{adminAnalytics.in_progress_orders}</h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">В обработке</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:scale-105 group animate-fadeIn cursor-pointer" style={{animationDelay: '400ms'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-emerald-600 bg-opacity-20 group-hover:bg-opacity-30 group-hover:scale-110 transition-all duration-300">
                <svg className="w-6 h-6 text-emerald-400 group-hover:animate-ping" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors duration-300 animate-counterUp">
                  {adminAnalytics.total_traders > 0 ? 
                    ((adminAnalytics.online_traders / adminAnalytics.total_traders) * 100).toFixed(1) : 0}%
                </h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Онлайн трейдеров</p>
              </div>
            </div>
          </div>
        </div>

        {/* Volume Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:scale-105 group animate-fadeIn cursor-pointer" style={{animationDelay: '500ms'}}>
            <h3 className="text-lg font-semibold text-white mb-4 group-hover:text-purple-400 transition-colors duration-300 flex items-center">
              <svg className="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Объемы торгов
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between hover:bg-gray-700/30 p-2 rounded transition-all duration-300 hover:scale-105">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">USDT:</span>
                <span className="text-white font-medium group-hover:text-purple-400 transition-colors duration-300 animate-counterUp">{formatAmount(adminAnalytics.total_volume_usdt)}</span>
              </div>
              <div className="flex justify-between hover:bg-gray-700/30 p-2 rounded transition-all duration-300 hover:scale-105">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">KZT:</span>
                <span className="text-emerald-400 font-medium group-hover:animate-pulse transition-all duration-300">{formatAmount(adminAnalytics.total_volume_kzt)} ₸</span>
              </div>
              <div className="flex justify-between hover:bg-gray-700/30 p-2 rounded transition-all duration-300 hover:scale-105">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Покупки:</span>
                <span className="text-green-400 font-medium group-hover:animate-bounce transition-all duration-300">{formatAmount(adminAnalytics.buy_volume_usdt)} USDT</span>
              </div>
              <div className="flex justify-between hover:bg-gray-700/30 p-2 rounded transition-all duration-300 hover:scale-105">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Продажи:</span>
                <span className="text-orange-400 font-medium group-hover:animate-pulse transition-all duration-300">{formatAmount(adminAnalytics.sell_volume_usdt)} USDT</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 hover:scale-105 group animate-fadeIn cursor-pointer" style={{animationDelay: '600ms'}}>
            <h3 className="text-lg font-semibold text-white mb-4 group-hover:text-cyan-400 transition-colors duration-300 flex items-center">
              <svg className="w-5 h-5 mr-2 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Активность
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between hover:bg-gray-700/30 p-2 rounded transition-all duration-300 hover:scale-105">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Сегодня:</span>
                <span className="text-white font-medium group-hover:text-cyan-400 transition-colors duration-300 animate-counterUp">{adminAnalytics.today_orders} заявок</span>
              </div>
              <div className="flex justify-between hover:bg-gray-700/30 p-2 rounded transition-all duration-300 hover:scale-105">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">За месяц:</span>
                <span className="text-white font-medium group-hover:text-indigo-400 transition-colors duration-300 animate-counterUp">{adminAnalytics.month_orders} заявок</span>
              </div>
              <div className="flex justify-between hover:bg-gray-700/30 p-2 rounded transition-all duration-300 hover:scale-105">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Трейдеров:</span>
                <span className="text-white font-medium group-hover:text-blue-400 transition-colors duration-300 animate-counterUp">{adminAnalytics.total_traders}</span>
              </div>
              <div className="flex justify-between hover:bg-gray-700/30 p-2 rounded transition-all duration-300 hover:scale-105">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Активные:</span>
                <span className="text-green-400 font-medium group-hover:animate-pulse transition-all duration-300">{adminAnalytics.active_traders}</span>
              </div>
              <div className="flex justify-between hover:bg-gray-700/30 p-2 rounded transition-all duration-300 hover:scale-105">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Онлайн:</span>
                <span className="text-blue-400 font-medium group-hover:animate-bounce transition-all duration-300">
                  {adminAnalytics.online_traders} ({adminAnalytics.total_traders > 0 ? 
                    ((adminAnalytics.online_traders / adminAnalytics.total_traders) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 hover:border-green-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10 hover:scale-105 group animate-fadeIn cursor-pointer" style={{animationDelay: '700ms'}}>
            <h3 className="text-lg font-semibold text-white mb-4 group-hover:text-green-400 transition-colors duration-300 flex items-center">
              <svg className="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Успешность
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between hover:bg-gray-700/30 p-2 rounded transition-all duration-300 hover:scale-105">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Всего заявок:</span>
                <span className="text-white font-medium group-hover:text-green-400 transition-colors duration-300 animate-counterUp">{adminAnalytics.total_orders}</span>
              </div>
              <div className="flex justify-between hover:bg-gray-700/30 p-2 rounded transition-all duration-300 hover:scale-105">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Завершено:</span>
                <span className="text-green-400 font-medium group-hover:animate-bounce transition-all duration-300">{adminAnalytics.completed_orders}</span>
              </div>
              <div className="flex justify-between hover:bg-gray-700/30 p-2 rounded transition-all duration-300 hover:scale-105">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Успешность:</span>
                <span className="text-blue-400 font-medium group-hover:animate-pulse transition-all duration-300">{adminAnalytics.success_rate}%</span>
              </div>
              <div className="flex justify-between hover:bg-gray-700/30 p-2 rounded transition-all duration-300 hover:scale-105">
                <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Новые:</span>
                <span className="text-yellow-400 font-medium group-hover:animate-bounce transition-all duration-300">{adminAnalytics.new_orders}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Traders Analytics */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 transition-all duration-300 hover:shadow-xl hover:shadow-gray-500/10 animate-fadeIn" style={{animationDelay: '800ms'}}>
          <h2 className="text-xl font-semibold text-white mb-6 hover:text-blue-400 transition-colors duration-300 flex items-center">
            <svg className="w-6 h-6 mr-3 text-blue-400 hover:animate-spin transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Аналитика по трейдерам
          </h2>
          <div className="space-y-4">
            {analytics.map((trader, index) => (
              <div key={trader.trader_info.id} className="bg-gray-900/50 rounded-lg p-4 hover:bg-gray-900/70 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:scale-[1.02] group animate-fadeIn border border-transparent hover:border-blue-500/30" style={{animationDelay: `${900 + index * 100}ms`}}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <span className="text-white text-sm font-bold">
                        {trader.trader_info.first_name?.charAt(0)}{trader.trader_info.last_name?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white group-hover:text-blue-400 transition-colors duration-300">
                        {trader.trader_info.first_name} {trader.trader_info.last_name}
                      </h3>
                      <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors duration-300">{trader.trader_info.phone}</p>
                      {trader.trader_info.is_online && (
                        <div className="flex items-center space-x-1 mt-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                          <span className="text-green-400 text-xs animate-pulse">Онлайн</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Успешность</div>
                    <div className="text-lg font-semibold text-blue-400 group-hover:scale-110 transition-transform duration-300 animate-counterUp">{trader.success_rate}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="group-hover:bg-gray-800/50 p-3 rounded-lg transition-all duration-300 hover:scale-105">
                    <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Всего заявок</div>
                    <div className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors duration-300 animate-counterUp">{trader.total_orders}</div>
                  </div>
                  <div className="group-hover:bg-gray-800/50 p-3 rounded-lg transition-all duration-300 hover:scale-105">
                    <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">В обработке</div>
                    <div className="text-xl font-semibold text-yellow-400 group-hover:animate-pulse transition-all duration-300">{trader.in_progress_orders}</div>
                  </div>
                  <div className="group-hover:bg-gray-800/50 p-3 rounded-lg transition-all duration-300 hover:scale-105">
                    <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Объем USDT</div>
                    <div className="text-xl font-semibold text-white group-hover:text-purple-400 transition-colors duration-300 animate-counterUp">{formatAmount(trader.total_volume_usdt)}</div>
                  </div>
                  <div className="group-hover:bg-gray-800/50 p-3 rounded-lg transition-all duration-300 hover:scale-105">
                    <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Депозит</div>
                    <div className="text-xl font-semibold text-emerald-400 group-hover:animate-bounce transition-all duration-300">{formatAmount(trader.deposit_amount)} ₸</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="group-hover:bg-gray-800/30 p-2 rounded transition-all duration-300 hover:scale-105">
                    <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Сегодня: </span>
                    <span className="text-white group-hover:text-cyan-400 transition-colors duration-300 font-medium">{trader.today_stats.orders_count} заявок</span>
                  </div>
                  <div className="group-hover:bg-gray-800/30 p-2 rounded transition-all duration-300 hover:scale-105">
                    <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">За неделю: </span>
                    <span className="text-white group-hover:text-indigo-400 transition-colors duration-300 font-medium">{trader.week_stats.orders_count} заявок</span>
                  </div>
                  <div className="group-hover:bg-gray-800/30 p-2 rounded transition-all duration-300 hover:scale-105">
                    <span className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Последняя заявка: </span>
                    <span className="text-white group-hover:text-pink-400 transition-colors duration-300 font-medium">{formatDate(trader.last_order_date)}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Покупки: </span>
                    <span className="text-emerald-400">{trader.buy_orders_count} ({formatAmount(trader.buy_volume_usdt)} USDT)</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Продажи: </span>
                    <span className="text-orange-400">{trader.sell_orders_count} ({formatAmount(trader.sell_volume_usdt)} USDT)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
} 