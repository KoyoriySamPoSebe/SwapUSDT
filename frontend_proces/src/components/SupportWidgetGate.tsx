import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { SupportWidget } from './SupportWidget'

export const SupportWidgetGate: React.FC = () => {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading || !isAuthenticated || !user) return null

  return <SupportWidget user={user} />
}
