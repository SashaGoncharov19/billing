'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Building2, LayoutDashboard, CreditCard, Receipt, LifeBuoy, Settings } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, translationKey: 'dashboard' },
  { href: '/billing', icon: CreditCard, translationKey: 'billing' },
  { href: '/invoices', icon: Receipt, translationKey: 'invoices' },
  { href: '/tickets', icon: LifeBuoy, translationKey: 'tickets' },
  { href: '/settings', icon: Settings, translationKey: 'settings' },
]

export function Sidebar({ className }: { className?: string }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const { tenant } = useAuthStore()

  return (
    <div className={cn("w-64 border-r bg-card flex flex-col", className)}>
      <div className="h-16 flex items-center px-6 border-b">
        <Building2 className="mr-2 h-6 w-6 text-brand-primary" />
        <span className="font-semibold">{tenant?.name || 'Entity Seven'}</span>
      </div>
      <div className="p-4 flex-1 space-y-1">
        {navItems.map(item => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.translationKey as never)}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
