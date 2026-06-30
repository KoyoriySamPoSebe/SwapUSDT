import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Layout } from './Layout'
import { AdminDashboard } from '../pages/AdminDashboard'
import { TraderDashboard } from '../pages/TraderDashboard'

export const Dashboard: React.FC = () => {
  const { user } = useAuth()

  if (!user) return null

  // Если пользователь админ, показываем аналитику
  if (user.role === 'admin') {
    return <AdminDashboard />
  }

  // Если пользователь трейдер, показываем дашборд трейдера
  if (user.role === 'trader') {
    return <TraderDashboard />
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              Добро пожаловать, {user.first_name}!
            </h1>
            <p className="text-gray-300">
              Панель управления
            </p>
          </div>

          {/* User Info */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Информация о пользователе
            </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <span className="text-gray-400 text-sm">Имя:</span>
                <p className="text-white font-medium">{user.first_name}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Фамилия:</span>
                <p className="text-white font-medium">{user.last_name}</p>
              </div>
              {user.patronymic_name && (
                <div>
                  <span className="text-gray-400 text-sm">Отчество:</span>
                  <p className="text-white font-medium">{user.patronymic_name}</p>
                </div>
              )}
              <div>
                <span className="text-gray-400 text-sm">Телефон:</span>
                <p className="text-white font-medium">{user.phone}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-gray-400 text-sm">Email:</span>
                <p className="text-white font-medium">{user.email || 'Не указан'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Роль:</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user.role === 'admin' 
                    ? 'bg-purple-900 text-purple-200' 
                    : 'bg-blue-900 text-blue-200'
                }`}>
                  {user.role}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Статус:</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user.is_blocked 
                    ? 'bg-red-900 text-red-200' 
                    : 'bg-green-900 text-green-200'
                }`}>
                  {user.is_blocked ? 'Заблокирован' : 'Активен'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-sm">ID:</span>
                <p className="text-white font-mono text-xs break-all">{user.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-600 bg-opacity-20">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-white">Профиль</h3>
                <p className="text-gray-400">Управление данными</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-600 bg-opacity-20">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-white">Задачи</h3>
                <p className="text-gray-400">0 активных</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-600 bg-opacity-20">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-white">Настройки</h3>
                <p className="text-gray-400">Конфигурация</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 