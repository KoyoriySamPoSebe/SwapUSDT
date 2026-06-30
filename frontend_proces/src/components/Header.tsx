import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiService } from '../services/api'

export const Header: React.FC = () => {
  const { user, logout, updateUser } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isOnlineToggling, setIsOnlineToggling] = useState(false)

  const handleOnlineToggle = async () => {
    if (!user || user.role !== 'trader' || isOnlineToggling) return
    
    try {
      setIsOnlineToggling(true)
      const newOnlineStatus = !user.is_online
      await apiService.updateTraderOnlineStatus(newOnlineStatus)
      
      // Обновляем пользователя в контексте
      updateUser({ ...user, is_online: newOnlineStatus })
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error)
      alert('Ошибка при обновлении статуса')
    } finally {
      setIsOnlineToggling(false)
    }
  }

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div></div>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`flex items-center space-x-3 p-2 rounded-lg transition-all duration-300 ${
                user?.role === 'trader' && user?.is_online 
                  ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 animate-pulse hover:scale-105 shadow-lg shadow-green-500/20' 
                  : 'hover:bg-gray-700'
              }`}
            >
              <div className={`w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center relative ${
                user?.role === 'trader' && user?.is_online ? 'animate-bounce' : ''
              }`}>
                <span className="text-white text-sm font-bold">
                  {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                </span>
                {/* Онлайн индикатор */}
                {user?.role === 'trader' && user?.is_online && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 border-2 border-gray-800 rounded-full animate-ping"></div>
                )}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-white text-sm font-medium">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs flex items-center space-x-1">
                  <span className="text-gray-400">{user?.role}</span>
                  {user?.role === 'trader' && user?.is_online && (
                    <span className="text-green-400 animate-pulse">• онлайн</span>
                  )}
                </p>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
                isProfileOpen ? 'rotate-180' : ''
              } ${
                user?.role === 'trader' && user?.is_online ? 'animate-bounce' : ''
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-gray-700">
                    <p className="text-white text-sm font-medium">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {user?.phone}
                    </p>
                  </div>

                  {/* Online Toggle for Traders */}
                  {user?.role === 'trader' && (
                    <div className="px-4 py-3 border-b border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                          </svg>
                          <span className="text-gray-300 text-sm">
                            {user.is_online ? 'Онлайн' : 'Оффлайн'}
                          </span>
                        </div>
                        <button
                          onClick={handleOnlineToggle}
                          disabled={isOnlineToggling}
                          className={`
                            relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none
                            ${user.is_online ? 'bg-green-500' : 'bg-gray-600'}
                            ${isOnlineToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          <span
                            className={`
                              inline-block h-3 w-3 transform rounded-full bg-white transition-transform
                              ${user.is_online ? 'translate-x-5' : 'translate-x-1'}
                            `}
                          />
                          {isOnlineToggling && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-2 w-2 border-b border-white"></div>
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-700 mt-1 pt-1">
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Выйти</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 