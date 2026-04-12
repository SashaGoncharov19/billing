'use client'

import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TenantDetail {
  tenant: {
    id: string
    name: string
    slug: string
    createdAt: string
    deletedAt: string | null
    primaryColor: string
  }
  members: Array<{ id: string; userId: string; role: string }>
  invoices: Array<{ id: string; amount: number; status: string; createdAt: string }>
}

export default function TenantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id ?? '') as string
  const t = useTranslations('admin.tenantDetail')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenant-detail', id],
    queryFn: () => apiRequest<TenantDetail>(`/api/admin/tenants/${id}`),
    enabled: !!id
  })

  if (isLoading) return <div className="p-6">{t('loading')}</div>
  if (!data) return <div className="p-6">{t('notFound')}</div>

  const { tenant, members, invoices } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          {tenant.name}
          {tenant.deletedAt ? (
             <Badge variant="destructive">{t('status.suspended')}</Badge>
          ) : (
             <Badge className="bg-green-500 hover:bg-green-600">{t('status.active')}</Badge>
          )}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.title')}</CardTitle>
            <CardDescription>{t('profile.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><span className="font-semibold">{t('profile.slug')}</span> {tenant.slug}</div>
            <div>
              <span className="font-semibold">{t('profile.colors')}</span> 
              <div className="inline-block w-4 h-4 rounded ml-2 align-middle border" style={{ backgroundColor: tenant.primaryColor }} />
              <span className="ml-2 text-sm text-muted-foreground">{tenant.primaryColor}</span>
            </div>
            <div><span className="font-semibold">{t('profile.createdAt')}</span> {new Date(tenant.createdAt).toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5"/> {t('members.title')}</CardTitle>
            <CardDescription>{t('members.total', { count: members.length })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {members.map(m => (
                <div key={m.id} className="flex justify-between items-center text-sm border-b pb-1 last:border-0">
                  <span className="truncate max-w-[200px]">{m.userId}</span>
                  <Badge variant="outline">{m.role}</Badge>
                </div>
              ))}
              {members.length === 0 && <div className="text-sm text-muted-foreground">{t('members.empty')}</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> {t('invoices.title')}</CardTitle>
            <CardDescription>{t('invoices.total', { count: invoices.length })}</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <div className="grid grid-cols-4 gap-4 text-sm font-semibold mb-2 border-b pb-2">
                <div>{t('invoices.columns.id')}</div>
                <div>{t('invoices.columns.amount')}</div>
                <div>{t('invoices.columns.status')}</div>
                <div>{t('invoices.columns.date')}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{t('invoices.empty')}</div>
            )}
            <div className="space-y-2">
              {invoices.map(inv => (
                <div key={inv.id} className="grid grid-cols-4 gap-4 text-sm items-center border-b pb-2 last:border-0 last:pb-0">
                  <div className="truncate pr-2 text-muted-foreground text-xs">{inv.id}</div>
                  <div>${inv.amount ? (inv.amount / 100).toFixed(2) : '0.00'}</div>
                  <div><Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>{inv.status}</Badge></div>
                  <div>{new Date(inv.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
