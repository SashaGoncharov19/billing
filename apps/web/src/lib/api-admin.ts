import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import axios from 'axios'

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
  metadata: any
  createdAt: string
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
      const { data } = await api.get<any[]>('/admin/products')
      return data
    }
  })
}

export const useAdminCreateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/admin/products', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() })
    }
  })
}
