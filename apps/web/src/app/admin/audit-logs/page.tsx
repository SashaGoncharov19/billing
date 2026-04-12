'use client'

import { useTranslations } from 'next-intl'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'

interface LogEntry {
  id: string
  action: string
  userId?: string | null
  ipAddress?: string | null
  createdAt: string
}

export default function AdminAuditLogsPage() {
  const t = useTranslations('admin.audit')
  
  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => apiRequest<LogEntry[]>('/api/admin/audit-logs')
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>{t('action')}</TableHead>
              <TableHead>{t('user')}</TableHead>
              <TableHead>{t('ip')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>
            ) : logs?.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="font-medium text-blue-600 dark:text-blue-400">
                  {log.action}
                </TableCell>
                <TableCell>{log.userId || 'System'}</TableCell>
                <TableCell className="text-muted-foreground">{log.ipAddress || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
