import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'

// Layouts & Protection
import PortalLayout from './layouts/PortalLayout'
import AdminLayout from './layouts/AdminLayout'
import AuthLayout from './layouts/AuthLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/portal/Dashboard'
import AdminDashboard from './pages/admin/AdminDashboard'

// Ticket Pages
import TicketsList from './pages/portal/tickets/TicketsList'
import CreateTicket from './pages/portal/tickets/CreateTicket'
import TicketDetail from './pages/portal/tickets/TicketDetail'

import AdminTickets from './pages/admin/AdminTickets'

function App() {
  const [theme] = useState<'dark' | 'light' | 'system'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light' | 'system') || 'system'
  })

  // Basic theme application
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <Router>
      <Toaster position="top-center" richColors theme={theme === 'system' ? 'system' : theme} />
      <Routes>
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>

        <Route path="/admin" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="tickets" element={<AdminTickets />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
        </Route>

        <Route path="/" element={
          <ProtectedRoute>
            <PortalLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="invoices" element={<div className="p-4 bg-card rounded-xl border">Invoices coming soon</div>} />
          
          <Route path="tickets" element={<TicketsList />} />
          <Route path="tickets/new" element={<CreateTicket />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          
          <Route path="settings" element={<div className="p-4 bg-card rounded-xl border">Settings coming soon</div>} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
