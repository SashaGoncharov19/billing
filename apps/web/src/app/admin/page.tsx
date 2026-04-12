'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'

interface StatsResponse {
  totalTenants: number
  revenue: number
  activeSubs: number
  openTickets: number
}

export default function AdminDashboardPage() {
  const t = useTranslations('admin.dashboard')
  
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiRequest<StatsResponse>('/api/admin/stats')
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      {isLoading ? (
        <p>{t('loading')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalTenants')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.totalTenants ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('revenue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${data?.revenue ?? '0.00'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('activeSubs')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.activeSubs ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('openTickets')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.openTickets ?? 0}</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>{t('recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">{t('noActivity')}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
