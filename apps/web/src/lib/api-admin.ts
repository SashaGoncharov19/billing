import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import axios from 'axios'
import { toast } from 'sonner'

// Types
export interface AdminStats {
  totalTenants: number
  openTickets: number
  activeSubs: number
  revenue: number
}

export interface SystemHealth {
  status: 'ok' | 'degraded'
  timestamp: string
  version: string
  uptime: number
  services: {
    database: { status: 'ok' | 'error'; latency?: number }
    redis: { status: 'ok' | 'error'; latency?: number }
    queue: { status: 'ok' | 'error'; size?: number }
  }
}

export interface AuditLog {
  id: string
  tenantId?: string
  userId?: string
  action: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface Product {
  id: string
  name: string
  description?: string
  price: string | number
  setupFee?: string | number
  currency: string
  billingType: string
  billingInterval?: string
  pluginType?: string
  pluginConfig?: { hostingPlanId?: string }
  createdAt: string
  updatedAt: string
}

export interface Currency {
  id: string
  code: string
  symbol: string
  exchangeRate: string | number
  isBaseCurrency: boolean
  isActive: boolean
}

export interface PaymentMethod {
  id: string
  name: string
  identifier: string
  type: string
  instructions?: string
  isActive: boolean
}

export interface Invoice {
  id: string
  number: number
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  currency: string
  subtotalAmount: string
  taxAmount: string
  totalAmount: string
  paidAmount: string
  pdfUrl?: string
  createdByUserId?: string
  issuedAt?: string
  dueAt?: string
  paidAt?: string
  voidedAt?: string
  createdAt: string
  items?: unknown[]
}

export interface Tenant {
  id: string
  name: string
  billingEntity?: string
  billingAddress?: string
  billingTaxId?: string
  billingEmail?: string
  billingCountry?: string
}

// Hooks
export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  health: () => [...adminKeys.all, 'health'] as const,
  auditLogs: () => [...adminKeys.all, 'audit-logs'] as const,
  plugins: () => [...adminKeys.all, 'plugins'] as const,
  pluginOptions: (id: string) => [...adminKeys.all, 'plugins', id, 'options'] as const,
  products: () => [...adminKeys.all, 'products'] as const,
  currencies: () => [...adminKeys.all, 'currencies'] as const,
  paymentMethods: () => [...adminKeys.all, 'paymentMethods'] as const,
  invoices: () => [...adminKeys.all, 'invoices'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  userDetail: (id: string) => [...adminKeys.all, 'users', id] as const,
  settings: () => [...adminKeys.all, 'settings'] as const,
}

export const useAdminStats = () => {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async () => {
      // NOTE: backend endpoint is prefixed at /api/v1/admin
      const { data } = await api.get<AdminStats>('/admin/stats')
      return data
    },
    refetchInterval: 60000, // Refresh every minute
  })
}

export const useSystemHealth = () => {
  return useQuery({
    queryKey: adminKeys.health(),
    queryFn: async () => {
      // /health is on the root, outside of /api/v1
      const { data } = await axios.get<SystemHealth>('/health')
      return data
    },
    refetchInterval: 30000,
  })
}

export const useSystemAuditLogs = () => {
  return useQuery({
    queryKey: adminKeys.auditLogs(),
    queryFn: async () => {
      const { data } = await api.get<AuditLog[]>('/admin/audit-logs')
      return data
    },
    refetchInterval: 60000,
  })
}

export const useAdminPlugins = () => {
  return useQuery({
    queryKey: adminKeys.plugins(),
    queryFn: async () => {
      const { data } = await api.get<{id: string, name: string}[]>('/admin/plugins')
      return data
    }
  })
}

export const useAdminPluginOptions = (pluginId?: string) => {
  return useQuery({
    queryKey: adminKeys.pluginOptions(pluginId || ''),
    queryFn: async () => {
      if (!pluginId) return []
      const { data } = await api.get<{id: string | number, name: string}[]>(`/admin/plugins/${pluginId}/options`)
      return data
    },
    enabled: !!pluginId
  })
}

export const useAdminProducts = () => {
  return useQuery({
    queryKey: adminKeys.products(),
    queryFn: async () => {
      const { data } = await api.get<Product[]>('/admin/products')
      return data
    }
  })
}

export const useAdminCreateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/admin/products', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() })
    }
  })
}

export const useAdminUpdateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, tenantId, payload }: { id: string, tenantId: string, payload: Record<string, unknown> }) => {
      const { data } = await api.patch(`/admin/products/${id}`, { ...payload, tenantId })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() })
    }
  })
}

export const useAdminDeleteProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, tenantId }: { id: string, tenantId: string }) => {
      const { data } = await api.delete(`/admin/products/${id}?tenantId=${tenantId}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() })
    }
  })
}

// --- Currencies ---

export const useAdminUsers = () => {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: async () => {
      const { data } = await api.get('/admin/users')
      return data
    }
  })
}

export const useAdminUserDetail = (id: string) => {
  return useQuery({
    queryKey: adminKeys.userDetail(id),
    queryFn: async () => {
      const { data } = await api.get(`/admin/users/${id}`)
      return data
    },
    enabled: !!id
  })
}

export const useAdminCurrencies = () => {
  return useQuery({
    queryKey: adminKeys.currencies(),
    queryFn: async () => {
      const { data } = await api.get<Currency[]>('/admin/currencies')
      return data
    }
  })
}

export const useAdminCreateCurrency = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/admin/currencies', payload)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.currencies() })
  })
}

export const useAdminUpdateCurrency = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Record<string, unknown> }) => {
      const { data } = await api.patch(`/admin/currencies/${id}`, payload)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.currencies() })
  })
}

export const useAdminDeleteCurrency = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/currencies/${id}`)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.currencies() })
  })
}

// --- Payment Methods ---

export const useAdminPaymentMethods = () => {
  return useQuery({
    queryKey: adminKeys.paymentMethods(),
    queryFn: async () => {
      const { data } = await api.get<PaymentMethod[]>('/admin/payment-methods')
      return data
    }
  })
}

export const useAdminCreatePaymentMethod = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/admin/payment-methods', payload)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.paymentMethods() })
  })
}

export const useAdminUpdatePaymentMethod = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Record<string, unknown> }) => {
      const { data } = await api.patch(`/admin/payment-methods/${id}`, payload)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.paymentMethods() })
  })
}

export const useAdminDeletePaymentMethod = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/payment-methods/${id}`)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.paymentMethods() })
  })
}

export const useAdminSettings = () => {
  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn: async () => {
      // Points to /api/v1/admin/settings
      const { data } = await api.get('/admin/settings')
      return data
    }
  })
}

export const useAdminUpdateSettings = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.patch('/admin/settings', payload)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.settings() })
  })
}

export const useAdminInvoices = (statusFilter?: string) => {
  return useQuery({
    queryKey: [...adminKeys.invoices(), statusFilter],
    queryFn: async () => {
      const { data } = await api.get<{ data: Invoice[] }>('/invoices', { params: { status: statusFilter } })
      return data.data
    },
    refetchInterval: (query) => {
      const data = query.state.data as Invoice[] | undefined
      const hasMissingPdfs = data?.some(inv => !inv.pdfUrl)
      return hasMissingPdfs ? 3000 : false
    }
  })
}

export const useAdminInvoicePay = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/invoices/${id}/pay`)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.invoices() })
  })
}

export const useAdminInvoicePdf = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.get<{ url: string }>(`/invoices/${id}/pdf`)
      return data.url
    }
  })
}

export const useAdminInvoiceGeneratePdf = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/invoices/${id}/generate-pdf`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminInvoices'] })
      toast.success('Queued PDF generation')
    }
  })
}

export const useAdminApproveInvoice = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/admin/invoices/${id}/approve`, {})
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminInvoices'] })
      toast.success('Invoice approved and marked as paid')
    }
  })
}

export const useAdminDeleteInvoice = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/invoices/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminInvoices'] })
      toast.success('Invoice deleted successfully')
    }
  })
}

export interface TaxRate {
  id: string
  tenantId: string
  countryCode: string
  taxRate: string
  createdAt: string
  updatedAt: string
}

export const useAdminTaxes = () => {
  return useQuery({
    queryKey: ['admin', 'taxes'],
    queryFn: async () => {
      const { data } = await api.get<TaxRate[]>('/admin/taxes')
      return data
    }
  })
}

export const useAdminCreateTax = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { countryCode: string, taxRate: string | number }) => {
      const { data } = await api.post('/admin/taxes', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'taxes'] })
    }
  })
}

export const useAdminDeleteTax = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/taxes/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'taxes'] })
    }
  })
}
