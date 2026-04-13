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

// Shop Pages
import ShopList from './pages/portal/shop/ShopList'
import ProductDetail from './pages/portal/shop/ProductDetail'
import Checkout from './pages/portal/shop/Checkout'
import PortalInvoices from './pages/portal/PortalInvoices'
import AccountBillingProfile from './pages/portal/AccountBillingProfile'

import AdminTickets from './pages/admin/AdminTickets'
import AdminProducts from './pages/admin/AdminProducts'
import AdminCurrencies from './pages/admin/AdminCurrencies'
import AdminPaymentMethods from './pages/admin/AdminPaymentMethods'

import AdminSettings from './pages/admin/AdminSettings'
import AdminInvoices from './pages/admin/AdminInvoices'

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
          <Route path="products" element={<AdminProducts />} />
          <Route path="currencies" element={<AdminCurrencies />} />
          <Route path="payment-methods" element={<AdminPaymentMethods />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="invoices" element={<AdminInvoices />} />
        </Route>

        <Route path="/" element={
          <ProtectedRoute>
            <PortalLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="invoices" element={<PortalInvoices />} />
          
          <Route path="tickets" element={<TicketsList />} />
          <Route path="tickets/new" element={<CreateTicket />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          
          <Route path="shop" element={<ShopList />} />
          <Route path="shop/:id" element={<ProductDetail />} />
          <Route path="shop/checkout/:id" element={<Checkout />} />
          
          <Route path="settings" element={<AccountBillingProfile />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
