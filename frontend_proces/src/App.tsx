import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Dashboard } from './components/Dashboard'
import { TradersPageNew as TradersPage } from './pages/TradersPageNew'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { TraderOrdersPage } from './pages/TraderOrdersPage'
import { SupportWidgetGate } from './components/SupportWidgetGate'
import { LandingPage } from './pages/LandingPage'

function App() {
  return (
    <div className="dark">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/account" element={
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
          <SupportWidgetGate />
        </Router>
      </AuthProvider>
    </div>
  )
}

export default App 