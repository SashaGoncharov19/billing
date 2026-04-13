import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Filter, AlertCircle, Clock, MessageSquare } from 'lucide-react'
import { useAdminTickets } from '../../lib/api-tickets'
import type { TicketStatus, TicketPriority } from '../../lib/api-tickets'
import type { ReactNode } from 'react'
import { format } from 'date-fns'

const statusColors: Record<TicketStatus, string> = {
  open: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  in_progress: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  waiting_customer: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  resolved: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  closed: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
}

const statusDisplay: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_customer: 'Waiting on Customer',
  resolved: 'Resolved',
  closed: 'Closed'
}

const priorityIcons: Record<TicketPriority, ReactNode> = {
  low: <Clock size={14} className="text-slate-500" />,
  medium: <AlertCircle size={14} className="text-blue-500" />,
  high: <AlertCircle size={14} className="text-amber-500" />,
  critical: <AlertCircle size={14} className="text-destructive" />
}

export default function AdminTickets() {
  const [filter, setFilter] = useState<TicketStatus | 'all'>('all')
  
  const { data: tickets, isLoading } = useAdminTickets(
    filter === 'all' ? {} : { status: filter }
  )

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Queues</h1>
          <p className="text-muted-foreground mt-1">Manage global support tickets</p>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border/50 shadow-sm rounded-2xl overflow-hidden"
      >
        {/* Toolbar */}
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between bg-muted/20">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              type="text" 
              placeholder="Search by ID or subject..." 
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            <Filter size={16} className="text-muted-foreground shrink-0" />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value as TicketStatus | 'all')}
              className="bg-background border border-input rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary min-w-[140px]"
            >
              <option value="all">Global Queue (All)</option>
              <option value="open">Requires Attention (Open)</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_customer">Waiting on Customer</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-border/50">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading queues...</div>
          ) : !tickets?.length ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <MessageSquare size={32} className="text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No tickets</h3>
              <p className="text-muted-foreground mt-1 max-w-sm">
                The global support queue is empty.
              </p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <Link 
                key={ticket.id} 
                to={`/admin/tickets/${ticket.id}`}
                className="block p-4 sm:p-6 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-1.5 flex-1 w-full overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">#{ticket.id.substring(0, 8)}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${statusColors[ticket.status]}`}>
                        {statusDisplay[ticket.status]}
                      </span>
                      {ticket.priority !== 'low' && ticket.priority !== 'medium' && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
                          {priorityIcons[ticket.priority]}
                          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                        </span>
                      )}
                      
                      {/* Emphasize user ID since email relation is missing */}
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-border/50 bg-muted/20 text-muted-foreground truncate max-w-[100px]">
                        User {ticket.createdByUserId?.substring(0, 8)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg group-hover:text-brand-primary transition-colors truncate">
                      {ticket.subject}
                    </h3>
                  </div>
                  
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-sm text-muted-foreground shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} />
                      {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                    </div>
                    <div className="hidden sm:block mt-1 text-xs">
                       Updated {format(new Date(ticket.updatedAt), 'MMM d')}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}
