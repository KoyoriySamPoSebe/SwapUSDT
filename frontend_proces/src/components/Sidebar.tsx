import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface MenuItem {
  id: string
  title: string
  icon: React.ReactNode
  path: string
  badge?: string
}

interface SidebarProps {
  isCollapsed: boolean
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
  const location = useLocation()
  const { user, logout } = useAuth()

  // Базовые пункты меню
  const baseMenuItems: MenuItem[] = [
    {
      id: 'dashboard',
      title: 'Главная',
      path: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
        </svg>
      )
    }
  ]

  // Меню для администратора
  const adminMenuItems: MenuItem[] = [
    {
      id: 'traders',
      title: 'Трейдеры',
      path: '/traders',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'applications',
      title: 'Заявки',
      path: '/applications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
  ]

  // Меню для трейдера
  const traderMenuItems: MenuItem[] = [
    {
      id: 'orders',
      title: 'Ордера',
      path: '/orders',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      badge: '2'
    }
  ]

  // Формируем итоговый список меню в зависимости от роли
  const menuItems = user?.role === 'admin' 
    ? [...baseMenuItems, ...adminMenuItems]
    : [...baseMenuItems, ...traderMenuItems]

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <aside className={`bg-gray-800 border-r border-gray-700 flex flex-col h-screen transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-80'
    }`}>
      {/* Logo */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center relative">
            {/* Exchange arrows */}
            <svg className="w-5 h-5 absolute" viewBox="0 0 24 24" fill="none">
              <path d="M6 9h9l-2-2m0 0l2 2m-2-2v4" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18 15H9l2 2m0 0l-2-2m2 2v-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {/* Dollar sign */}
            <text x="12" y="14" textAnchor="middle" fill="#fbbf24" fontSize="6" fontWeight="bold" fontFamily="Arial, sans-serif">$</text>
          </div>
          {!isCollapsed && (
            <span className="text-white font-bold text-lg">SwapUSDT</span>
          )}
        </div>
      </div>



      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors group ${
              isCollapsed ? 'justify-center space-x-0' : 'space-x-3 justify-start'
            } ${
              isActive(item.path)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className={`flex-shrink-0 ${isActive(item.path) ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
              {item.icon}
            </span>
            
            {!isCollapsed && (
              <>
                <span className="font-medium">{item.title}</span>
                {item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-700">
        {/* Logout Button */}
        <button
          onClick={logout}
          className={`w-full flex items-center space-x-2 px-3 py-2 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors group ${
            isCollapsed ? 'justify-center' : 'justify-start'
          }`}
          title="Выйти"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && (
            <span className="font-medium">Выйти</span>
          )}
        </button>
      </div>
    </aside>
  )
} 