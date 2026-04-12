'use client'

import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'

export default function SettingsPage() {
  const navT = useTranslations('nav')
  const t = useTranslations('settings')
  const { user, tenant } = useAuthStore()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{navT('settings')}</h1>
      
      <Tabs defaultValue="profile" className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="profile">{t('tabs.profile')}</TabsTrigger>
          <TabsTrigger value="tenant">{t('tabs.workspace')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.title')}</CardTitle>
              <CardDescription>{t('profile.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.role')}</Label>
                <Input value={user?.role || 'member'} disabled />
              </div>
            </CardContent>
            <CardFooter>
              <Button>{t('profile.save')}</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="tenant" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('workspace.title')}</CardTitle>
              <CardDescription>{t('workspace.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('workspace.name')}</Label>
                <Input defaultValue={tenant?.name || ''} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('workspace.primaryColor')}</Label>
                  <div className="flex items-center gap-2">
                    <Input type="color" defaultValue={tenant?.primaryColor || '#3B82F6'} className="w-16 h-10 p-1" />
                    <Input defaultValue={tenant?.primaryColor || '#3B82F6'} />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>{t('workspace.save')}</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
