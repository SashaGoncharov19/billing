import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import api from '../lib/api'
import { toast } from 'sonner'
import { LogOut, LayoutDashboard, ReceiptText, Ticket, Settings, Briefcase, ShieldCheck, ShoppingBag, ShoppingCart } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCartStore } from '../store/cart.store'

export default function PortalLayout() {
  const { user, tenant, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const cartItemCount = useCartStore(state => state.getTotalItems())

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (e) {
      // Ignore network errors on logout
    }
    logout()
    toast.success('Logged out successfully')
    navigate('/auth/login', { replace: true })
  }

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Store', path: '/shop', icon: <ShoppingBag size={18} /> },
    { name: 'Invoices', path: '/invoices', icon: <ReceiptText size={18} /> },
    { name: 'Tickets', path: '/tickets', icon: <Ticket size={18} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={18} /> },
  ]

  const initials = user?.email?.substring(0, 2).toUpperCase() || 'U'

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="w-64 border-r border-border/50 bg-card/30 backdrop-blur-md hidden md:flex flex-col">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border/50">
          <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <Briefcase size={18} />
          </div>
          <span className="font-bold text-lg tracking-tight">EntitySeven</span>
        </div>
        
        <div className="px-4 py-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            Main Menu
          </div>
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname.startsWith(link.path)
              return (
                <Link 
                  key={link.path} 
                  to={link.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {link.icon}
                  {link.name}
                </Link>
              )
            })}
          </nav>
          
          {/* Admin shortcut if authorized */}
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <div className="mt-6 border-t border-border/50 pt-4">
              <div className="text-xs font-semibold text-brand-primary uppercase tracking-wider mb-2 px-2">
                Administration
              </div>
              <Link
                to="/admin"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-brand-primary hover:bg-brand-primary/10 transition-all duration-200"
              >
                <ShieldCheck size={18} />
                Admin Center
              </Link>
            </div>
          )}
        </div>

        <div className="mt-auto p-4 border-t border-border/50">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer mb-2 transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-primary/20">
              {initials}
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.email?.split('@')[0]}</span>
              <span className="text-xs text-muted-foreground truncate">{tenant?.name || 'Personal'}</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-border/50 bg-background/50 backdrop-blur-xl flex items-center justify-between px-6 z-10">
          <div className="md:hidden font-bold flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Briefcase size={14} />
            </div>
            EntitySeven
          </div>
          <div className="hidden md:flex text-sm font-medium text-muted-foreground">
            {navLinks.find(l => location.pathname.startsWith(l.path))?.name || 'Portal'}
          </div>
          
          <div className="flex items-center gap-6">
            <Link to="/checkout" className="relative group flex items-center justify-center p-2 rounded-full hover:bg-muted transition-colors">
              <ShoppingCart size={20} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm ring-2 ring-background">
                  {cartItemCount}
                </span>
              )}
            </Link>
          
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-primary/20 cursor-pointer hover:bg-primary/20 transition-colors">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/20">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
