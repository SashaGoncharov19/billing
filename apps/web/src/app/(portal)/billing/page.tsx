'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function BillingPage() {
  const navT = useTranslations('nav')
  const t = useTranslations('billing')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{navT('billing')}</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between p-4 border rounded-md">
            <div>
              <p className="font-semibold text-lg">Pro Plan</p>
              <p className="text-sm text-muted-foreground">$99.00 / month</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                {t('active')}
              </span>
              <p className="text-xs text-muted-foreground mt-2">{t('renewsOn', { date: 'Feb 1, 2026' })}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button>{t('changePlan')}</Button>
          <Button variant="outline">{t('manageBilling')}</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
