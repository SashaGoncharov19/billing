export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'

export const VALID_TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress', 'closed'], // Also can jump to closed directly sometimes
  in_progress: ['waiting_customer', 'resolved', 'closed'],
  waiting_customer: ['in_progress', 'resolved', 'closed'],
  resolved: ['in_progress', 'closed'], // open again if customer reopened
  closed: ['open'], // Admin can reopen
}

export class InvalidTicketTransitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidTicketTransitionError'
  }
}
