import { useAdminStats, useSystemHealth, useSystemAuditLogs } from '../../lib/api-admin'
import { motion } from 'framer-motion'
import { Server, Users, CreditCard, Ticket, Clock, CheckCircle2, AlertTriangle, XCircle, Activity } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / (3600*24));
  const h = Math.floor(seconds % (3600*24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats()
  const { data: health, isLoading: healthLoading } = useSystemHealth()
  const { data: logs, isLoading: logsLoading } = useSystemAuditLogs()

  // Generate plausible growth chart based on current stats to make it look alive
  const currentRevenue = stats?.revenue ? stats.revenue / 100 : 0
  const mockChartData = [
    { name: 'Jan', revenue: currentRevenue * 0.4, views: 400 },
    { name: 'Feb', revenue: currentRevenue * 0.45, views: 300 },
    { name: 'Mar', revenue: currentRevenue * 0.6, views: 550 },
    { name: 'Apr', revenue: currentRevenue * 0.8, views: 420 },
    { name: 'May', revenue: currentRevenue * 0.9, views: 700 },
    { name: 'Jun', revenue: currentRevenue, views: 850 },
  ]

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
        <p className="text-muted-foreground mt-2">Global metrics and real-time operational status.</p>
      </div>

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-card border rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Monthly Revenue</h3>
              <CreditCard className="text-green-500 opacity-80" size={18} />
            </div>
            <div className="mt-4 text-3xl font-bold text-green-500">
              ${currentRevenue.toFixed(2)}
            </div>
          </motion.div>
          
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Active Subscriptions</h3>
              <Activity className="text-brand-primary opacity-80" size={18} />
            </div>
            <div className="mt-4 text-3xl font-bold">
              {stats?.activeSubs || 0}
            </div>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Total Tenants</h3>
              <Users className="text-purple-500 opacity-80" size={18} />
            </div>
            <div className="mt-4 text-3xl font-bold">
              {stats?.totalTenants || 0}
            </div>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Open Support Tickets</h3>
              <Ticket className="text-amber-500 opacity-80" size={18} />
            </div>
            <div className="mt-4 text-3xl font-bold text-amber-500">
              {stats?.openTickets || 0}
            </div>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm flex flex-col">
          <div className="p-6 border-b border-border/50">
            <h3 className="font-semibold leading-none tracking-tight">Revenue Growth (Simulated)</h3>
            <p className="text-sm text-muted-foreground mt-1">YTD monthly progression</p>
          </div>
          <div className="p-6 flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-brand-primary)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-brand-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-foreground)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-brand-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Server Health Widget */}
        <div className="rounded-xl border bg-card shadow-sm flex flex-col">
          <div className="p-6 border-b border-border/50 flex justify-between items-center">
            <div>
              <h3 className="font-semibold leading-none tracking-tight">System Status</h3>
              <p className="text-sm text-muted-foreground mt-1">/health telemetry</p>
            </div>
            {healthLoading ? (
              <div className="w-3 h-3 rounded-full bg-muted animate-pulse" />
            ) : health?.status === 'ok' ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                OPERATIONAL
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-full border border-destructive/20">
                <AlertTriangle size={12} />
                DEGRADED
              </div>
            )}
          </div>
          
          <div className="p-6 space-y-6">
             <div className="flex justify-between items-center bg-muted/40 p-3 rounded-lg border border-border/50">
               <div className="flex items-center gap-2">
                 <Clock size={16} className="text-brand-primary" />
                 <span className="text-sm font-medium">Uptime</span>
               </div>
               <span className="text-sm font-mono">{health ? formatUptime(health.uptime) : '--'}</span>
             </div>

             <div className="space-y-4">
               <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Server size={14} className="text-muted-foreground" /> PostgreSQL
                    </span>
                    <span className="text-xs text-muted-foreground">{health?.services.database.latency || 0}ms</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                     <div className={`h-1.5 rounded-full ${health?.services.database.status === 'ok' ? 'bg-brand-primary' : 'bg-destructive'}`} style={{ width: health ? '100%' : '0%' }}></div>
                  </div>
               </div>

               <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Server size={14} className="text-muted-foreground" /> Redis Cache
                    </span>
                    <span className="text-xs text-muted-foreground">{health?.services.redis.latency || 0}ms</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                     <div className={`h-1.5 rounded-full ${health?.services.redis.status === 'ok' ? 'bg-brand-primary' : 'bg-destructive'}`} style={{ width: health ? '100%' : '0%' }}></div>
                  </div>
               </div>

               <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Server size={14} className="text-muted-foreground" /> Background Queue
                    </span>
                    <span className="text-xs text-muted-foreground">{health?.services.queue.size !== undefined ? `${health.services.queue.size} jobs` : '--'}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                     <div className={`h-1.5 rounded-full ${health?.services.queue.status === 'ok' ? 'bg-brand-primary' : 'bg-destructive'}`} style={{ width: health ? '100%' : '0%' }}></div>
                  </div>
               </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* Audit Logs */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-6 border-b border-border/50">
          <h3 className="font-semibold leading-none tracking-tight">Recent Live Audit Logs</h3>
          <p className="text-sm text-muted-foreground mt-1">System-wide platform activity feed</p>
        </div>
        <div className="p-0">
          <div className="max-h-[400px] overflow-y-auto w-full">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/40 sticky top-0">
                <tr>
                  <th className="px-6 py-3 font-medium">Timestamp</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Tenant ID</th>
                  <th className="px-6 py-3 font-medium text-right">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {logsLoading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading logs...</td></tr>
                ) : logs?.length ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-3 font-medium text-foreground">
                        {log.action}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground font-mono text-xs">
                        {log.tenantId ? log.tenantId.substring(0, 8) + '...' : 'System'}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground font-mono text-xs text-right">
                        {log.userId ? log.userId.substring(0, 8) + '...' : 'System'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No logs captured yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
