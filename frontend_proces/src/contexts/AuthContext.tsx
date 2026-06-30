import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  first_name: string
  last_name: string
  patronymic_name: string | null
  phone: string
  email: string | null
  avatar: string | null
  birthday: string | null
  role: string
  is_blocked: boolean
  is_online?: boolean
}

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  login: (phone: string, password: string) => Promise<boolean>
  logout: () => void
  updateUser: (userData: User) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Проверяем токен при загрузке
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      fetchUserData()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch('http://localhost:8001/api/me/', {
        headers: {
          'Authorization': token,
          'accept': 'application/json'
        }
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setIsAuthenticated(true)
      } else {
        // Токен недействителен
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setIsAuthenticated(false)
        setUser(null)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (phone: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8001/api/login/', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Сохраняем токены
        localStorage.setItem('access_token', data.access)
        localStorage.setItem('refresh_token', data.refresh)
        
        // Получаем данные пользователя
        await fetchUserData()
        
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setIsAuthenticated(false)
    setUser(null)
  }

  const updateUser = (userData: User) => {
    setUser(userData)
  }

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    updateUser,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 