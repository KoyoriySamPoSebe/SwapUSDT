import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AuthModal } from '../components/AuthModal'
import { API_BASE_URL } from '../config'

interface ExchangeRate {
  pair: string
  buy_rate: string
  sell_rate: string
  mid_rate: string
  updated_at: string
}

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [rate, setRate] = useState<ExchangeRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null)
  const [calcMode, setCalcMode] = useState<'buy' | 'sell'>('buy')
  const [calcAmount, setCalcAmount] = useState('')
  const [calcResult, setCalcResult] = useState('')

  const fetchRate = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/exchange/rate/`)
      if (response.ok) {
        const data = await response.json()
        setRate(data)
      }
    } catch (error) {
      console.error('Error fetching rate:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRate()
    const interval = setInterval(fetchRate, 60000)
    return () => clearInterval(interval)
  }, [fetchRate])

  useEffect(() => {
    if (rate && calcAmount) {
      const amount = parseFloat(calcAmount)
      if (!isNaN(amount)) {
        const rateValue = parseFloat(calcMode === 'buy' ? rate.buy_rate : rate.sell_rate)
        if (calcMode === 'buy') {
          setCalcResult((amount * rateValue).toFixed(2))
        } else {
          setCalcResult((amount / rateValue).toFixed(2))
        }
      }
    } else {
      setCalcResult('')
    }
  }, [calcAmount, calcMode, rate])

  const handleStartExchange = () => {
    if (isAuthenticated) {
      navigate('/account')
    } else {
      setAuthModal('register')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3 min-h-16 py-2 sm:py-0 sm:h-16">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <img src="/logo.png" alt="SwapUSDT" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover flex-shrink-0" />
              <span className="text-lg sm:text-xl font-bold text-white truncate">SwapUSDT</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/account')}
                  className="px-3 py-1.5 sm:px-5 sm:py-2 text-sm sm:text-base bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  <span className="sm:hidden">Кабинет</span>
                  <span className="hidden sm:inline">Личный кабинет</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setAuthModal('login')}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base text-gray-300 hover:text-white transition-colors whitespace-nowrap"
                  >
                    Войти
                  </button>
                  <button
                    onClick={() => setAuthModal('register')}
                    className="px-3 py-1.5 sm:px-5 sm:py-2 text-sm sm:text-base bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    Регистрация
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-sm font-medium">Курс обновляется в реальном времени</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Обмен <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">USDT</span> и <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">KZT</span>
                <br />быстро и выгодно
              </h1>
              <p className="text-lg text-gray-400 mb-8 max-w-xl">
                Покупка и продажа USDT за KZT по лучшему курсу.
                Безопасно, надежно, круглосуточно.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleStartExchange}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                >
                  Начать обмен
                </button>
                <a
                  href="#how-it-works"
                  className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors border border-gray-700"
                >
                  Как это работает
                </a>
              </div>
            </div>

            {/* Right: Rate Card + Calculator */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur-3xl" />
              <div className="relative bg-gray-800/80 backdrop-blur-xl border border-gray-700 rounded-2xl p-6 shadow-2xl">
                {/* Rate Display */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Текущий курс</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Обновлено
                    </div>
                  </div>
                  {loading ? (
                    <div className="animate-pulse">
                      <div className="h-12 bg-gray-700 rounded-lg mb-2" />
                      <div className="h-12 bg-gray-700 rounded-lg" />
                    </div>
                  ) : rate ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Покупка USDT</p>
                            <p className="text-lg font-bold text-white">1 USDT = {parseFloat(rate.buy_rate).toFixed(2)} ₸</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Продажа USDT</p>
                            <p className="text-lg font-bold text-white">1 USDT = {parseFloat(rate.sell_rate).toFixed(2)} ₸</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400">Не удалось загрузить курс</p>
                  )}
                </div>

                {/* Calculator */}
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-4">Калькулятор</h4>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setCalcMode('buy')}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                        calcMode === 'buy'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Покупка USDT
                    </button>
                    <button
                      onClick={() => setCalcMode('sell')}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                        calcMode === 'sell'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Продажа USDT
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        {calcMode === 'buy' ? 'Сумма USDT' : 'Сумма в тенге'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={calcAmount}
                          onChange={(e) => setCalcAmount(e.target.value)}
                          placeholder="0"
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          {calcMode === 'buy' ? 'USDT' : '₸'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        {calcMode === 'buy' ? 'Вы заплатите' : 'Вы получите'}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={calcResult}
                          readOnly
                          placeholder="0"
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          {calcMode === 'buy' ? '₸' : 'USDT'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleStartExchange}
                    className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all"
                  >
                    {isAuthenticated ? 'Создать заявку' : 'Зарегистрироваться'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Почему выбирают нас</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              SwapUSDT — надежный сервис обмена криптовалюты в Казахстане
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: 'Мгновенный обмен',
                description: 'Заявки обрабатываются в течение нескольких минут',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Безопасность',
                description: 'Все транзакции защищены и проверены',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Лучший курс',
                description: 'Минимальный спред, курс обновляется каждую минуту',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-gray-800 border border-gray-700 rounded-2xl hover:border-emerald-500/50 transition-colors group"
              >
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 group-hover:bg-emerald-500/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Как это работает</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Простой процесс обмена в 4 шага
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Регистрация', description: 'Создайте аккаунт за 30 секунд' },
              { step: '02', title: 'Добавьте реквизиты', description: 'Укажите карту или криптокошелек' },
              { step: '03', title: 'Создайте заявку', description: 'Выберите сумму и направление обмена' },
              { step: '04', title: 'Получите деньги', description: 'После подтверждения средства поступят на ваш счет' },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-8 md:p-12 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-3xl">
            <h2 className="text-3xl font-bold text-white mb-4">
              Готовы начать обмен?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Присоединяйтесь к тысячам пользователей, которые уже обменивают USDT на тенге с нами
            </p>
            <button
              onClick={handleStartExchange}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25"
            >
              Начать обмен
            </button>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 px-4 bg-gray-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">О нас</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              SwapUSDT — сервис мгновенного обмена криптовалюты в Казахстане
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 bg-gray-900 border border-gray-700 rounded-2xl">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-5">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Скорость</h3>
              <p className="text-gray-400 leading-relaxed">
                Мы обрабатываем заявки за считанные минуты. Наша система автоматически подбирает лучший курс 
                и назначает трейдера, чтобы вы получили средства максимально быстро — без лишних ожиданий и задержек.
              </p>
            </div>
            <div className="p-8 bg-gray-900 border border-gray-700 rounded-2xl">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-5">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Надёжность</h3>
              <p className="text-gray-400 leading-relaxed">
                Каждая сделка проходит через верифицированных трейдеров с подтверждённой репутацией. 
                Мы работаем круглосуточно и гарантируем безопасность ваших средств на каждом этапе обмена.
              </p>
            </div>
          </div>
          <div className="mt-8 p-8 bg-gray-900 border border-gray-700 rounded-2xl text-center">
            <p className="text-gray-300 leading-relaxed max-w-3xl mx-auto">
              Мы создали SwapUSDT, чтобы обмен крипты в Казахстане стал простым и понятным. 
              Без скрытых комиссий, без сложных интерфейсов — только честный курс, быстрая обработка и поддержка 24/7.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SwapUSDT" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-gray-400 text-sm">© 2026 SwapUSDT. Все права защищены.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#about" className="text-gray-400 hover:text-white text-sm transition-colors">О нас</a>
            <a href="#how-it-works" className="text-gray-400 hover:text-white text-sm transition-colors">Как это работает</a>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitchMode={(mode) => setAuthModal(mode)}
        />
      )}
    </div>
  )
}
