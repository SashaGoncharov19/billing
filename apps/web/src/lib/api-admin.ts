import { useQuery } from '@tanstack/react-query'
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
