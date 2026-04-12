'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { apiRequest } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(data: LoginValues) {
    try {
      setError(null)
      const res = await apiRequest<{ accessToken: string, user: unknown, tenant: unknown }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      
      document.cookie = `access_token=${res.accessToken}; path=/; max-age=86400`
      setAuth(
        res.accessToken,
        res.user as import('@/store/auth.store').User,
        res.tenant as import('@/store/auth.store').Tenant
      )
      router.push('/dashboard')
    } catch (err: unknown) {
      setError((err as Error).message || tCommon('error'))
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('login')}</CardTitle>
        <CardDescription>{t('loginDesc')}</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" type="email" placeholder="name@example.com" {...form.register('email')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input id="password" type="password" {...form.register('password')} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? tCommon('loading') : t('login')}
          </Button>
          <Button variant="link" type="button" onClick={() => router.push('/register')} className="w-full">
            {t('needAccount')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
