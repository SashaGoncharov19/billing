import { useAuthStore } from '../../store/auth.store'
import { motion } from 'framer-motion'

export default function Dashboard() {
  const { user, tenant } = useAuthStore()

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-end"
      >
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.firstName || user?.email?.split('@')[0] || 'User'}! 👋
        </h1>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {[
          { label: 'Active Services', value: '0' },
          { label: 'Unpaid Invoices', value: '0' },
          { label: 'Amount Due', value: '$0.00' },
          { label: 'Open Tickets', value: '0' },
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            whileHover={{ y: -2 }}
            className="rounded-2xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all"
          >
            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{stat.label}</h3>
            </div>
            <div className="p-6 pt-0">
              <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-7"
      >
        <div className="col-span-4 rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex items-center justify-between border-b border-border/50">
            <h3 className="font-semibold leading-none tracking-tight">Recent Invoices</h3>
          </div>
          <div className="p-12 flex items-center justify-center">
            <div className="text-sm text-muted-foreground flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                📄
              </div>
              No invoices found yet.
            </div>
          </div>
        </div>
        <div className="col-span-3 rounded-2xl border bg-card text-card-foreground shadow-sm bg-gradient-to-br from-card to-muted/20">
          <div className="p-6 flex flex-col space-y-1.5 border-b border-border/50">
            <h3 className="font-semibold leading-none tracking-tight">Workspace Info</h3>
          </div>
          <div className="p-6 pt-6">
            <div className="space-y-4">
              <div>
                <div className="font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  {tenant?.name || 'Personal'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
