import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Building, ShieldCheck, Ticket, LogOut, Package, Globe, CreditCard } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/auth.store'

export default function AdminLayout() {
  const location = useLocation()
  const logout = useAuthStore(s => s.logout)

  const links = [
    { to: '/admin', icon: LayoutDashboard, label: 'Overview' },
    { to: '/admin/tickets', icon: Ticket, label: 'Support Queues' },
    { to: '/admin/products', icon: Package, label: 'Products' },
    { to: '/admin/payment-methods', icon: CreditCard, label: 'Payment Methods' },
    { to: '/admin/currencies', icon: Globe, label: 'Currencies' },
    { to: '/admin/tenants', icon: Building, label: 'Tenants' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/audit', icon: ShieldCheck, label: 'Audit Logs' },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-[#0A0A0A] text-slate-300 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-white/5 font-bold text-lg text-white">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/20">
            <span className="text-white text-sm">ES</span>
          </div>
          Admin Center
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {links.map((link) => {
            const isActive = location.pathname === link.to || (link.to !== '/admin' && location.pathname.startsWith(link.to))
            const Icon = link.icon

            return (
              <Link
                key={link.to}
                to={link.to}
                className="block relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="admin-active-nav"
                    className="absolute inset-0 bg-white/10 rounded-lg"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <div className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}>
                  <Icon size={18} />
                  {link.label}
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="h-16 border-b border-border/50 bg-card/50 backdrop-blur flex items-center justify-between px-4 md:px-8">
          <div className="md:hidden font-bold flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-brand-primary text-white flex items-center justify-center text-[10px]">ES</div>
            Admin
          </div>
          <div className="hidden md:flex text-sm text-muted-foreground font-medium">
            Admin Workspace
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-500 text-sm font-medium">
                A
              </div>
              <div className="hidden sm:block text-xs">
                <p className="font-semibold text-foreground">System Admin</p>
                <p className="text-muted-foreground">admin@entityseven.com</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
