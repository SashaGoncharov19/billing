'use client'

import { useTranslations } from 'next-intl'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function TicketsPage() {
  const t = useTranslations('tickets')
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> {t('new')}
        </Button>
      </div>
      
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.id')}</TableHead>
              <TableHead>{t('columns.subject')}</TableHead>
              <TableHead>{t('columns.priority')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead>{t('columns.created')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">TIC-1234</TableCell>
              <TableCell>API Integration Issue</TableCell>
              <TableCell>High</TableCell>
              <TableCell>
                <Badge variant="outline">{t('status.open')}</Badge>
              </TableCell>
              <TableCell>Jan 12, 2026</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">TIC-1233</TableCell>
              <TableCell>Question about invoice</TableCell>
              <TableCell>Low</TableCell>
              <TableCell>
                <Badge variant="secondary">{t('status.resolved')}</Badge>
              </TableCell>
              <TableCell>Jan 10, 2026</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
