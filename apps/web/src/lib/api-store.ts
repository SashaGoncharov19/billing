import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import type { Product, Currency, PaymentMethod, Invoice } from './api-admin'

export const storeKeys = {
  all: ['store'] as const,
  products: () => [...storeKeys.all, 'products'] as const,
  product: (id: string) => [...storeKeys.all, 'products', id] as const,
  paymentMethods: () => [...storeKeys.all, 'paymentMethods'] as const,
  currencies: () => [...storeKeys.all, 'currencies'] as const,
}

export const useStoreProducts = () => {
  return useQuery({
    queryKey: storeKeys.products(),
    queryFn: async () => {
      const { data } = await api.get<Product[]>('/store/products')
      return data
    }
  })
}

export const useStoreProduct = (id: string) => {
  return useQuery({
    queryKey: storeKeys.product(id),
    queryFn: async () => {
      const { data } = await api.get<Product>(`/store/products/${id}`)
      return data
    },
    enabled: !!id
  })
}

export const useStorePaymentMethods = () => {
  return useQuery({
    queryKey: storeKeys.paymentMethods(),
    queryFn: async () => {
      const { data } = await api.get<PaymentMethod[]>('/store/payment-methods')
      return data
    }
  })
}

export const useStoreCurrencies = () => {
  return useQuery({
    queryKey: storeKeys.currencies(),
    queryFn: async () => {
      const { data } = await api.get<Currency[]>('/store/currencies')
      return data
    }
  })
}

export const useCheckoutMutation = () => {
  return useMutation({
    mutationFn: async (payload: { productId: string, paymentMethod: string, successUrl: string, cancelUrl: string }) => {
      // payload.paymentMethod might be read to switch endpoints if we support multiple methods.
      // Currently, we map to the standard Stripe billing checkout endpoint for CC.
      const { data } = await api.post<{ url: string }>('/billing/checkout', {
        productId: payload.productId,
        successUrl: payload.successUrl,
        cancelUrl: payload.cancelUrl
      })
      return data
    }
  })
}

export const useManualCheckoutMutation = () => {
  return useMutation({
    mutationFn: async (payload: { productId: string, paymentMethodId: string, currencyId?: string }) => {
      const { data } = await api.post<{ invoiceId: string }>('/billing/manual-checkout', payload)
      return data
    }
  })
}

// Portal user hooks
export const usePortalMe = () => {
  return useQuery({
    queryKey: ['portal', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me')
      return data
    }
  })
}

export const usePortalUpdateMe = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.patch('/auth/me', payload)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal', 'me'] })
  })
}

export const usePortalInvoices = () => {
  return useQuery({
    queryKey: ['portal', 'invoices'],
    queryFn: async () => {
      // For a portal user, status isn't necessarily filtered, just all their invoices
      const { data } = await api.get('/invoices')
      return data.data
    },
    refetchInterval: (query) => {
      const data = query.state.data as Invoice[] | undefined
      const hasMissingPdfs = data?.some(inv => !inv.pdfUrl)
      return hasMissingPdfs ? 3000 : false
    }
  })
}

export const usePortalInvoicePdf = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.get<{ url: string }>(`/invoices/${id}/pdf`)
      return data.url
    }
  })
}
