import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config'
import {
  formatKzPhoneInput,
  getKzPhoneDigits,
  isValidKzPhone,
  KZ_PHONE_PLACEHOLDER,
  normalizeKzPhoneOnBlur,
  normalizeKzPhoneOnFocus,
} from '../utils/phoneMask'

interface AuthModalProps {
  mode: 'login' | 'register'
  onClose: () => void
  onSwitchMode: (mode: 'login' | 'register') => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ mode, onClose, onSwitchMode }) => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'phone' || name === 'mobile') {
      setFormData({ ...formData, phone: formatKzPhoneInput(value) })
    } else {
      setFormData({ ...formData, [name]: value })
    }
    setError('')
  }

  const getPhoneDigits = () => getKzPhoneDigits(formData.phone)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!isValidKzPhone(formData.phone)) {
      setError('Введите полный номер телефона')
      setIsLoading(false)
      return
    }

    const success = await login(formData.phone, formData.password)
    if (success) {
      onClose()
      window.location.reload()
    } else {
      setError('Неверный номер телефона или пароль')
    }
    setIsLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!isValidKzPhone(formData.phone)) {
      setError('Введите полный номер телефона')
      setIsLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('access_token', data.access)
        localStorage.setItem('refresh_token', data.refresh)
        window.location.reload()
      } else {
        setError(data.phone?.[0] || data.detail || 'Ошибка при регистрации')
      }
    } catch (err) {
      setError('Ошибка соединения с сервером')
    }
    setIsLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="relative p-6 pb-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="text-center">
            <img src="/logo.png" alt="SwapUSDT" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              {mode === 'login' ? 'Вход в аккаунт' : 'Регистрация'}
            </h2>
            <p className="text-gray-400 text-sm">
              {mode === 'login'
                ? 'Введите данные для входа'
                : 'Создайте аккаунт для обмена USDT'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="p-6 space-y-4">
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Имя</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  placeholder="Иван"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Фамилия</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  placeholder="Иванов"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Номер телефона</label>
            <input
              type="tel"
              name="mobile"
              id="auth-mobile"
              value={formData.phone}
              onChange={handleChange}
              onFocus={() => setFormData((prev) => ({
                ...prev,
                phone: normalizeKzPhoneOnFocus(prev.phone),
              }))}
              onBlur={() => setFormData((prev) => ({
                ...prev,
                phone: normalizeKzPhoneOnBlur(prev.phone),
              }))}
              autoComplete="off"
              inputMode="numeric"
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              placeholder={KZ_PHONE_PLACEHOLDER}
              required
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email (необязательно)</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                placeholder="email@example.com"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Пароль</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              placeholder="••••••••"
              required
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Подтвердите пароль</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 disabled:shadow-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {mode === 'login' ? 'Вход...' : 'Регистрация...'}
              </span>
            ) : (
              mode === 'login' ? 'Войти' : 'Зарегистрироваться'
            )}
          </button>

          <div className="text-center text-sm text-gray-400">
            {mode === 'login' ? (
              <>
                Нет аккаунта?{' '}
                <button
                  type="button"
                  onClick={() => onSwitchMode('register')}
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Зарегистрироваться
                </button>
              </>
            ) : (
              <>
                Уже есть аккаунт?{' '}
                <button
                  type="button"
                  onClick={() => onSwitchMode('login')}
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Войти
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
