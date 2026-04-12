'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Building2, Users, FileText, Ticket, History, ArrowLeft, ShieldAlert } from 'lucide-react'

const navItems = [
  { href: '/admin', icon: LayoutDashboard, translationKey: 'admin.nav.dashboard', exact: true },
  { href: '/admin/tenants', icon: Building2, translationKey: 'admin.nav.tenants' },
  { href: '/admin/users', icon: Users, translationKey: 'admin.nav.users' },
  { href: '/admin/invoices', icon: FileText, translationKey: 'admin.nav.invoices' },
  { href: '/admin/tickets', icon: Ticket, translationKey: 'admin.nav.tickets' },
  { href: '/admin/audit-logs', icon: History, translationKey: 'admin.nav.auditLogs' },
]

export function AdminSidebar({ className }: { className?: string }) {
  const t = useTranslations()
  const pathname = usePathname()

  return (
    <div className={cn("w-64 border-r bg-card flex flex-col", className)}>
      <div className="h-16 flex items-center px-6 border-b text-red-600 dark:text-red-400">
        <ShieldAlert className="mr-2 h-6 w-6" />
        <span className="font-semibold uppercase tracking-wider">{t('admin.nav.superadmin' as never)}</span>
      </div>
      <div className="p-4 flex-1 space-y-1">
        {navItems.map(item => {
          const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href) ?? false
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.translationKey as never)}
            </Link>
          )
        })}
      </div>
      <div className="p-4 border-t">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('admin.nav.back' as never)}
        </Link>
      </div>
    </div>
  )
}
