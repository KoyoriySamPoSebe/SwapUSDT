import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  formatKzPhoneInput,
  isValidKzPhone,
  KZ_PHONE_PLACEHOLDER,
  normalizeKzPhoneOnBlur,
  normalizeKzPhoneOnFocus,
} from '../utils/phoneMask'

export const LoginForm: React.FC = () => {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!isValidKzPhone(phone)) {
      setError('Введите полный номер телефона')
      setIsLoading(false)
      return
    }

    const success = await login(phone, password)
    
    if (success) {
      navigate('/')
    } else {
      setError('Неверный номер телефона или пароль')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Вход в систему
          </h1>
          <p className="text-gray-300">
            Введите ваши данные для входа
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="auth-mobile" className="block text-sm font-medium text-gray-300 mb-2">
              Номер телефона
            </label>
            <input
              type="tel"
              id="auth-mobile"
              name="mobile"
              value={phone}
              onChange={(e) => setPhone(formatKzPhoneInput(e.target.value))}
              onFocus={() => setPhone((prev) => normalizeKzPhoneOnFocus(prev))}
              onBlur={() => setPhone((prev) => normalizeKzPhoneOnBlur(prev))}
              autoComplete="off"
              inputMode="numeric"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={KZ_PHONE_PLACEHOLDER}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Пароль
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Пароль"
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Вход...
              </span>
            ) : (
              'Войти'
            )}
          </button>
        </form>


      </div>
    </div>
  )
}
