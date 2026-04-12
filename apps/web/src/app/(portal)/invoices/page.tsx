'use client'

import { useTranslations } from 'next-intl'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function InvoicesPage() {
  const t = useTranslations('invoices')
  const navT = useTranslations('nav')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{navT('invoices')}</h1>
        <Button asChild>
          <a href="/dashboard/invoices/new">Create Invoice</a>
        </Button>
      </div>
      
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.id')}</TableHead>
              <TableHead>{t('columns.date')}</TableHead>
              <TableHead>{t('columns.amount')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead className="text-right">{t('columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Example rows, in reality fetched from API */}
            <TableRow>
              <TableCell className="font-medium">INV-042</TableCell>
              <TableCell>Jan 12, 2026</TableCell>
              <TableCell>$118.00</TableCell>
              <TableCell>
                <Badge variant="secondary">{t('status.open')}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">{t('view')}</Button>
                <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">INV-041</TableCell>
              <TableCell>Dec 12, 2025</TableCell>
              <TableCell>$99.00</TableCell>
              <TableCell>
                <Badge className="bg-green-500 hover:bg-green-600 dark:bg-green-600">{t('status.paid')}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">{t('view')}</Button>
                <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
