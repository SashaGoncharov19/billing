import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

export function usePortalServices(tenantId?: string) {
  return useQuery({
    queryKey: ['portal', 'services', tenantId],
    queryFn: async () => {
      const res = await api.get('/v1/services')
      return res.data
    },
    enabled: !!tenantId,
  })
}

export function useOrderService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { productId: string }) => {
      const res = await api.post('/v1/services', data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'services'] })
      qc.invalidateQueries({ queryKey: ['portal', 'tenant'] }) // to refresh balance
    }
  })
}

export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const res = await api.delete(`/v1/services/${serviceId}`)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'services'] })
      qc.invalidateQueries({ queryKey: ['portal', 'tenant'] })
    }
  })
}

export function useTopUpBalance() {
  return useMutation({
    mutationFn: async (data: { amount: number, successUrl: string, cancelUrl: string }) => {
      const res = await api.post('/billing/topup', data)
      return res.data
    }
  })
}
