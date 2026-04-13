import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { motion } from 'framer-motion'
import { ArrowLeft, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateTicket } from '../../../lib/api-tickets'

const createTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200, 'Subject is too long'),
  body: z.string().min(20, 'Please provide more details (at least 20 characters)').max(5000, 'Message is too long'),
  priority: z.enum(['low', 'medium', 'high', 'critical'])
})

type CreateTicketValues = z.infer<typeof createTicketSchema>

export default function CreateTicket() {
  const navigate = useNavigate()
  const createMutation = useCreateTicket()

  const { register, handleSubmit, formState: { errors } } = useForm<CreateTicketValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { subject: '', body: '', priority: 'medium' }
  })

  const onSubmit = (data: CreateTicketValues) => {
    createMutation.mutate(data, {
      onSuccess: (ticket) => {
        toast.success('Ticket created successfully')
        navigate(`/tickets/${ticket.id}`)
      },
      onError: () => {
        toast.error('Failed to create ticket. Please try again.')
      }
    })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Link 
          to="/tickets" 
          className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Support Ticket</h1>
          <p className="text-muted-foreground mt-1">We'll get back to you as soon as possible</p>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border/50 shadow-sm rounded-2xl overflow-hidden p-6 sm:p-8"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="subject">Subject</label>
            <input 
              {...register('subject')}
              className={`flex h-11 w-full rounded-md border bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary transition-all ${
                errors.subject ? 'border-destructive focus-visible:ring-destructive' : 'border-input/50'
              }`}
              id="subject" 
              type="text" 
              placeholder="Briefly describe your issue..." 
            />
            {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="priority">Priority</label>
            <select 
              {...register('priority')}
              className="flex h-11 w-full rounded-md border border-input/50 bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary transition-all"
              id="priority" 
            >
              <option value="low">Low - General Question</option>
              <option value="medium">Medium - Service Degraded</option>
              <option value="high">High - Service Down (Partial)</option>
              <option value="critical">Critical - Complete Outage</option>
            </select>
            {errors.priority && <p className="text-xs text-destructive">{errors.priority.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="body">Message Details</label>
            <textarea 
              {...register('body')}
              className={`flex min-h-[200px] w-full rounded-md border bg-background/50 px-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary transition-all resize-y ${
                errors.body ? 'border-destructive focus-visible:ring-destructive' : 'border-input/50'
              }`}
              id="body" 
              placeholder="Please provide as much detail as possible to help us resolve your issue..." 
            />
            {errors.body ? (
              <p className="text-xs text-destructive">{errors.body.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Markdown is supported for formatting.</p>
            )}
          </div>

          <div className="pt-4 border-t border-border/50 flex justify-end gap-3">
            <Link 
              to="/tickets"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-muted h-11 px-6"
            >
              Cancel
            </Link>
            <button 
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-foreground text-background hover:bg-foreground/90 h-11 px-8 shadow-md disabled:opacity-50"
            >
              {createMutation.isPending ? 'Sending...' : (
                <>
                  <Send size={16} />
                  Submit Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
