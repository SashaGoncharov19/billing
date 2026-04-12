'use client'

import { useTranslations } from 'next-intl'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'

interface Invoice {
  id: string
  tenantId: string
  amount: number
  status: string
  createdAt: string
}

export default function AdminInvoicesPage() {
  const t = useTranslations('admin.invoices')
  
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => apiRequest<Invoice[]>('/api/admin/invoices')
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Tenant ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5}>Loading...</TableCell></TableRow>
            ) : invoices?.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium text-xs text-muted-foreground">{inv.id}</TableCell>
                <TableCell className="text-xs">{inv.tenantId}</TableCell>
                <TableCell>${inv.amount ? (inv.amount / 100).toFixed(2) : '0.00'}</TableCell>
                <TableCell>
                  <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>{inv.status}</Badge>
                </TableCell>
                <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
