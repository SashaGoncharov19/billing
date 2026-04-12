'use client'

import { useTranslations } from 'next-intl'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'

interface Ticket {
  id: string
  subject: string
  status: string
  priority: string
  createdAt: string
  tenantId: string
}

export default function AdminTicketsPage() {
  const t = useTranslations('admin.tickets')
  
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: () => apiRequest<Ticket[]>('/api/admin/tickets')
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Tenant ID</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
            ) : tickets?.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium text-xs text-muted-foreground">{ticket.id}</TableCell>
                <TableCell className="text-xs">{ticket.tenantId}</TableCell>
                <TableCell>{ticket.subject}</TableCell>
                <TableCell>{ticket.priority}</TableCell>
                <TableCell>
                  <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>{ticket.status}</Badge>
                </TableCell>
                <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
