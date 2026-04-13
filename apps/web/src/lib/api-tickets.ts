import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'

// Types
export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'

export interface UserSnippet {
  id: string
  email: string
  role?: string
  firstName?: string | null
  lastName?: string | null
  billingName?: string | null
  billingCountry?: string | null
}

export interface TicketMessage {
  id: string
  ticketId: string
  userId: string
  body: string
  isInternal: boolean
  createdAt: string
  user?: UserSnippet
}

export interface Ticket {
  id: string
  tenantId: string
  createdByUserId: string
  assignedToUserId?: string | null
  subject: string
  body: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: string
  updatedAt: string
  assignedToUser?: UserSnippet | null
  createdBy?: UserSnippet
  createdByUser?: UserSnippet
  comments: TicketMessage[] // Usually provided on detail view
}

export interface QueryTicketsParams {
  status?: string
  priority?: string
  assignedToMe?: boolean
  limit?: number
}

// Hooks
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (filters: QueryTicketsParams) => [...ticketKeys.lists(), { filters }] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
}

export const useTickets = (filters: QueryTicketsParams = {}) => {
  return useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: async () => {
      const response = await api.get('/tickets', { params: filters })
      return response.data.data as Ticket[]
    },
  })
}

export const useAdminTickets = (filters: QueryTicketsParams = {}) => {
  return useQuery({
    queryKey: ['admin', ...ticketKeys.list(filters)],
    queryFn: async () => {
      const response = await api.get('/admin/tickets', { params: filters })
      return response.data.data as Ticket[]
    },
  })
}

export const useTicket = (id: string) => {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: async () => {
      if (!id) throw new Error('No id')
      const { data } = await api.get<Ticket>(`/tickets/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export const useCreateTicket = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { subject: string; body: string; priority?: string }) => {
      const { data } = await api.post('/tickets', payload)
      return data as Ticket
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
    },
  })
}

export const useUpdateTicket = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { status?: string; priority?: string; assignedToUserId?: string | null } }) => {
      const { data } = await api.patch<Ticket>(`/tickets/${id}`, payload)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
    },
  })
}

export const useAddTicketComment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { body: string; isInternal?: boolean } }) => {
      const { data } = await api.post(`/tickets/${id}/comments`, payload)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) })
    },
  })
}
