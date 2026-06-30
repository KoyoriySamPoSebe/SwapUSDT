import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AdminDashboard } from '../pages/AdminDashboard'
import { TraderDashboard } from '../pages/TraderDashboard'
import { ClientDashboard } from '../pages/ClientDashboard'

export const Dashboard: React.FC = () => {
  const { user } = useAuth()

  if (!user) return null

  if (user.role === 'admin') {
    return <AdminDashboard />
  }

  if (user.role === 'client') {
    return <ClientDashboard />
  }

  return <TraderDashboard />
} 