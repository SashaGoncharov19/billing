'use client'

import { useTranslations } from 'next-intl'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'

interface User {
  id: string
  email: string
  isEmailVerified: boolean
  createdAt: string
}

export default function AdminUsersPage() {
  const t = useTranslations('admin.users')
  
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiRequest<User[]>('/api/admin/users')
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>{t('columns.email')}</TableHead>
              <TableHead>Email Verified</TableHead>
              <TableHead>{t('columns.created')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>
            ) : users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="text-xs text-muted-foreground">{user.id}</TableCell>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  {user.isEmailVerified ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}
                </TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
