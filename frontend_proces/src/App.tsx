import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Dashboard } from './components/Dashboard'
import { LoginForm } from './components/LoginForm'
import { TradersPageNew as TradersPage } from './pages/TradersPageNew'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { TraderOrdersPage } from './pages/TraderOrdersPage'

function App() {
  return (
    <div className="dark">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/traders" element={
              <ProtectedRoute>
                <TradersPage />
              </ProtectedRoute>
            } />
            <Route path="/applications" element={
              <ProtectedRoute>
                <ApplicationsPage />
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <TraderOrdersPage />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </div>
  )
}

export default App 