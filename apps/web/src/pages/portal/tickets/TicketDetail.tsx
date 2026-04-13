import { useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, CheckCircle2, User as UserIcon, Building2 } from 'lucide-react'
import { useTicket, useAddTicketComment, useUpdateTicket } from '../../../lib/api-tickets'
import type { TicketStatus } from '../../../lib/api-tickets'
import { useAuthStore } from '../../../store/auth.store'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
  waiting_customer: 'Waiting on You',
  resolved: 'Resolved',
  closed: 'Closed'
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const currentUser = useAuthStore(s => s.user)
  const { data: ticket, isLoading, error } = useTicket(id!)
  const addCommentMutation = useAddTicketComment()
  const updateMutation = useUpdateTicket()

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner'

  const [commentBody, setCommentBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentBody.trim()) return

    addCommentMutation.mutate({
      id: id!,
      payload: { body: commentBody.trim(), isInternal: isAdmin ? isInternal : false }
    }, {
      onSuccess: () => {
        setCommentBody('')
        setIsInternal(false)
      }
    })
  }

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading ticket details...</div>
  }

  if (error || !ticket) {
    return (
      <div className="p-8 text-center flex flex-col items-center">
        <div className="text-destructive font-bold text-xl mb-4">Error loading ticket</div>
        <Link to="/tickets" className="text-brand-primary hover:underline">Back to Tickets</Link>
      </div>
    )
  }

  const isResolvedOrClosed = ticket.status === 'resolved' || ticket.status === 'closed'

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 shrink-0 pb-4"
      >
        <Link
          to={location.pathname.startsWith('/admin') ? '/admin/tickets' : '/tickets'}
          className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground shrink-0"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 truncate pr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">#{ticket.id}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${statusColors[ticket.status]}`}>
              {statusDisplay[ticket.status]}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight truncate">{ticket.subject}</h1>
          <div className="flex gap-2 items-center mt-1">
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/50">
              Assigned to: {ticket.assignedToUserId ? (ticket.assignedToUserId === currentUser?.id ? 'You' : ticket.assignedToUserId.substring(0, 8)) : 'Unassigned'}
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 min-h-0 bg-card border border-border/50 shadow-sm rounded-2xl flex flex-col overflow-hidden"
      >
        {/* Messages History (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="text-center">
            <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground font-medium">
              Ticket opened on {format(new Date(ticket.createdAt), 'MMMM d, yyyy h:mm a')}
            </span>
          </div>

          <div className="space-y-6">
            {/* Initial description message */}
            {ticket.body && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${ticket.createdByUserId === currentUser?.id ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${ticket.createdByUserId === currentUser?.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border'
                  }`}>
                  <UserIcon size={14} />
                </div>

                <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${ticket.createdByUserId === currentUser?.id ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-2 mb-1 px-1">
                    <span className="text-xs font-semibold">
                      {ticket.createdByUserId === currentUser?.id ? 'You' : `User ${ticket.createdByUserId.substring(0, 5)}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(ticket.createdAt), 'h:mm a')}
                    </span>
                  </div>

                  <div className={`p-3 sm:p-4 rounded-2xl text-sm ${ticket.createdByUserId === currentUser?.id
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted/50 border border-border/50 text-foreground rounded-tl-sm'
                    }`}>
                    <div className="font-semibold pb-2 border-b border-current/20 mb-2 opacity-90">
                      {ticket.subject}
                    </div>
                    <div className="markdown-content whitespace-pre-wrap break-words leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {ticket.body}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {ticket.comments?.map((msg, index) => {
              // Ignore internal admin messages if we are a client 
              // Assuming relation failure from backend, fallback to msg.userId:
              const messageUserId = msg.userId || msg.user?.id
              const isMe = messageUserId === currentUser?.id
              const isAgent = msg.user?.role === 'admin' || msg.user?.role === 'owner' || msg.user?.role === 'agent'

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  key={msg.id || index}
                  className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${isMe
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border'
                    }`}>
                    {isAgent ? <Building2 size={14} /> : <UserIcon size={14} />}
                  </div>

                  <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1 px-1">
                      <span className="text-xs font-semibold">
                        {isMe ? 'You' : (isAgent ? 'Support Agent' : (msg.user?.email ? msg.user.email.split('@')[0] : `User ${messageUserId?.substring(0, 5)}`))}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(msg.createdAt), 'h:mm a')}
                      </span>
                    </div>

                    <div className={`p-3 sm:p-4 rounded-2xl text-sm ${isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted/50 border border-border/50 text-foreground rounded-tl-sm'
                      } ${msg.isInternal ? 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-300' : ''}`}>
                      {msg.isInternal && (
                        <div className="text-[10px] uppercase font-bold tracking-wider mb-1 opacity-70">Internal Note</div>
                      )}
                      <div className="markdown-content whitespace-pre-wrap break-words leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.body}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Reply Box */}
        <div className="shrink-0 border-t border-border/50 p-4 bg-muted/10">
          {isResolvedOrClosed ? (
            <div className="flex flex-col items-center justify-center p-4 text-muted-foreground bg-muted/40 rounded-xl border border-border/50">
              <CheckCircle2 className="mb-2 text-emerald-500" size={24} />
              <p className="text-sm font-medium text-foreground">This ticket is {ticket.status}</p>
              <p className="text-xs text-center mt-1 max-w-sm">
                If you continue to experience issues, please open a new support ticket referencing this one.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendComment} className="flex flex-col gap-2">
              {isAdmin && (
                <>
                  <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/40 rounded-lg border border-border/50">
                    <span className="text-xs font-semibold text-muted-foreground mr-2">Admin Tools:</span>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="rounded border-input text-brand-primary"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                      />
                      Mark as Internal Note
                    </label>

                    {ticket.assignedToUserId === currentUser?.id ? (
                      <button
                        type="button"
                        onClick={() => updateMutation.mutate({ id: ticket.id, payload: { assignedToUserId: null } })}
                        className="text-[10px] px-2 py-1 rounded border border-border/50 bg-background hover:bg-muted font-medium transition-colors"
                        disabled={updateMutation.isPending}
                      >
                        Unassign
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateMutation.mutate({ id: ticket.id, payload: { assignedToUserId: currentUser?.id } })}
                        className="text-[10px] px-2 py-1 rounded border border-brand-primary/30 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 font-medium transition-colors"
                        disabled={updateMutation.isPending}
                      >
                        Assign to Me
                      </button>
                    )}

                    <select
                      className="ml-auto text-xs bg-background border border-input rounded-md px-2 py-1 cursor-pointer disabled:opacity-50"
                      value={ticket.status}
                      disabled={updateMutation.isPending}
                      onChange={(e) => {
                        updateMutation.mutate({ id: ticket.id, payload: { status: e.target.value } })
                      }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_customer">Waiting on Customer</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-1 mt-2">
                  {[
                    { label: 'Greeting', text: `Hi, it's operator ${currentUser?.id?.substring(0, 8)}. I'm here to help you resolve this issue.` },
                    { label: 'Investigating', text: `I've reviewed your request and our technical team is currently investigating this. I'll get back to you with an update shortly.` },
                    { label: 'Need Details', text: 'Could you please provide some more details or screenshots regarding this issue?' },
                    { label: 'Resolved', text: 'We have successfully resolved your issue! Please verify on your end and let us know if anything else comes up.' },
                    { label: 'Closing Inactive', text: 'Since we haven\'t heard back from you in a while, I will be closing this ticket for now. Feel free to reply to reopen it if the issue persists.' }
                  ].map(tmpl => (
                    <button
                      key={tmpl.label}
                      type="button"
                      onClick={() => setCommentBody(tmpl.text)}
                      className="text-[10px] px-2 py-1 flex items-center gap-1 rounded border border-border/50 bg-background hover:bg-muted font-medium transition-colors"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
                </>
              )}

              <div className="flex gap-2 items-end w-full">
                <div className="flex-1 bg-background rounded-xl border border-input/50 focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-brand-primary transition-all overflow-hidden shadow-sm">
                  <textarea
                    id="reply-textarea"
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Type your reply here..."
                    className="w-full max-h-48 min-h-[56px] p-3 text-sm focus:outline-none resize-none bg-transparent"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendComment(e)
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!commentBody.trim() || addCommentMutation.isPending}
                  className="shrink-0 h-[56px] px-6 bg-foreground text-background rounded-xl font-medium flex items-center justify-center disabled:opacity-50 hover:bg-foreground/90 transition-colors shadow-sm"
                >
                  {addCommentMutation.isPending ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
