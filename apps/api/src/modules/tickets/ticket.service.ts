import { db, tickets, ticketComments, memberships, users } from '@entityseven/db'
import { eq, and, desc, asc, or, type SQL } from 'drizzle-orm'
import {
  TicketStatus,
  TicketPriority,
  VALID_TICKET_TRANSITIONS,
  InvalidTicketTransitionError,
} from './ticket.types'
import { emailQueue } from '@api/queue'

export class TicketService {
  private validateTransition(current: TicketStatus, next: TicketStatus) {
    if (current === next) return
    if (!VALID_TICKET_TRANSITIONS[current]?.includes(next)) {
      throw new InvalidTicketTransitionError(`Cannot transition from ${current} to ${next}`)
    }
  }

  async createTicket(
    tenantId: string,
    userId: string,
    data: { subject: string; body: string; priority?: string },
  ) {
    return await db.transaction(async (tx) => {
      const [ticket] = await tx
        .insert(tickets)
        .values({
          tenantId,
          createdByUserId: userId,
          subject: data.subject,
          body: data.body,
          status: 'open',
          priority: (data.priority as TicketPriority) || 'medium',
        })
        .returning()

      if (!ticket) throw new Error('Failed to create ticket')

      const adminUsers = await tx
        .select({ email: users.email })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(
          and(
            eq(memberships.tenantId, tenantId),
            or(eq(memberships.role, 'admin'), eq(memberships.role, 'owner')),
          ),
        )

      for (const admin of adminUsers) {
        await emailQueue.add('send-email', {
          to: admin.email,
          subject: `[New Ticket #${ticket.id.split('-')[0]}] ${ticket.subject}`,
          body: `A new support ticket has been created by ${userId}:\n\n${ticket.body}`,
        })
      }

      return ticket
    })
  }

  async getTickets(
    tenantId: string,
    userId: string,
    role: string,
    filters: {
      status?: string | undefined
      priority?: string | undefined
      assignedToMe?: boolean | undefined
      limit?: number | undefined
    },
  ) {
    const conditions: SQL[] = [eq(tickets.tenantId, tenantId)]

    // RBAC: members only see their own tickets
    if (role !== 'admin' && role !== 'owner') {
      conditions.push(eq(tickets.createdByUserId, userId))
    }

    if (filters.status) conditions.push(eq(tickets.status, filters.status as TicketStatus))
    if (filters.priority) conditions.push(eq(tickets.priority, filters.priority as TicketPriority))
    if (filters.assignedToMe && (role === 'admin' || role === 'owner')) {
      conditions.push(eq(tickets.assignedToUserId, userId))
    }

    const data = await db.query.tickets.findMany({
      where: and(...conditions),
      orderBy: [desc(tickets.createdAt)],
      limit: filters.limit || 20,
    })

    return { data }
  }

  async getTicketById(tenantId: string, ticketId: string, userId: string, role: string) {
    const conditions: SQL[] = [eq(tickets.id, ticketId)]

    // RBAC check
    if (role !== 'admin' && role !== 'owner') {
      conditions.push(eq(tickets.tenantId, tenantId))
      conditions.push(eq(tickets.createdByUserId, userId))
    }

    const ticket = await db.query.tickets.findFirst({
      where: and(...conditions),
      with: {
        createdByUser: true,
        // We will fetch comments separately to safely filter isInternal
      },
    })

    if (!ticket) throw new Error('Ticket not found or access denied')

    const commentConditions: SQL[] = [eq(ticketComments.ticketId, ticketId)]
    // Member cannot see internal comments
    if (role !== 'admin' && role !== 'owner') {
      commentConditions.push(eq(ticketComments.isInternal, false))
    }

    const comments = await db.query.ticketComments.findMany({
      where: and(...commentConditions),
      orderBy: [asc(ticketComments.createdAt)],
    })

    return { ...ticket, comments }
  }

  async updateTicket(
    tenantId: string,
    ticketId: string,
    updates: { status?: string; priority?: string; assignedToUserId?: string | null },
    role?: string,
  ) {
    return await db.transaction(async (tx) => {
      const conditions: SQL[] = [eq(tickets.id, ticketId)]
      if (role !== 'admin' && role !== 'owner') {
        conditions.push(eq(tickets.tenantId, tenantId))
      }

      const ticket = await tx.query.tickets.findFirst({
        where: and(...conditions),
      })

      if (!ticket) throw new Error('Ticket not found')

      const valuesToUpdate: Partial<typeof tickets.$inferInsert> = { updatedAt: new Date() }

      if (updates.status && updates.status !== ticket.status) {
        this.validateTransition(ticket.status as TicketStatus, updates.status as TicketStatus)
        valuesToUpdate.status = updates.status as TicketStatus

        if (updates.status === 'resolved') valuesToUpdate.resolvedAt = new Date()
        if (updates.status === 'closed') valuesToUpdate.closedAt = new Date()

        const customer = await tx.query.users.findFirst({
          where: eq(users.id, ticket.createdByUserId),
        })
        if (customer) {
          await emailQueue.add('send-email', {
            to: customer.email,
            subject: `[Ticket Updated] Status changed to: ${updates.status}`,
            body: `Your ticket has been updated by our team.`,
          })
        }
      }

      if (updates.priority) valuesToUpdate.priority = updates.priority as TicketPriority

      if (updates.assignedToUserId !== undefined) {
        valuesToUpdate.assignedToUserId = updates.assignedToUserId
        if (updates.assignedToUserId && updates.assignedToUserId !== ticket.assignedToUserId) {
          const assignee = await tx.query.users.findFirst({
            where: eq(users.id, updates.assignedToUserId),
          })
          if (assignee) {
            await emailQueue.add('send-email', {
              to: assignee.email,
              subject: `[Ticket Assigned] A ticket has been assigned to you`,
              body: `You are now the assignee of ticket ${ticket.id}`,
            })
          }
        }
      }

      const [updated] = await tx
        .update(tickets)
        .set(valuesToUpdate)
        .where(eq(tickets.id, ticketId))
        .returning()

      return updated
    })
  }

  async addComment(
    tenantId: string,
    ticketId: string,
    userId: string,
    role: string,
    data: { body: string; isInternal?: boolean },
  ) {
    return await db.transaction(async (tx) => {
      // Must verify ticket existence/access
      const conditions: SQL[] = [eq(tickets.id, ticketId)]
      if (role !== 'admin' && role !== 'owner') {
        conditions.push(eq(tickets.tenantId, tenantId))
        conditions.push(eq(tickets.createdByUserId, userId))
      }

      const ticket = await tx.query.tickets.findFirst({
        where: and(...conditions),
      })

      if (!ticket) throw new Error('Ticket not found or access denied')

      // Members cannot post internal notes
      const isInternal = role === 'admin' || role === 'owner' ? (data.isInternal ?? false) : false

      const [comment] = await tx
        .insert(ticketComments)
        .values({
          ticketId,
          userId,
          body: data.body,
          isInternal,
        })
        .returning()

      // Auto-transitions
      const updates: Partial<typeof tickets.$inferInsert> = { updatedAt: new Date() }

      if (role !== 'admin' && role !== 'owner') {
        // If customer comments on waiting_customer or resolved, reopen it
        if (ticket.status === 'waiting_customer' || ticket.status === 'resolved') {
          updates.status = 'in_progress'
        }
      }

      await tx.update(tickets).set(updates).where(eq(tickets.id, ticketId))

      // Notify
      if (!isInternal) {
        if (role === 'admin' || role === 'owner') {
          const customer = await tx.query.users.findFirst({
            where: eq(users.id, ticket.createdByUserId),
          })
          if (customer) {
            await emailQueue.add('send-email', {
              to: customer.email,
              subject: `[Ticket Response] New comment on your ticket`,
              body: `An agent replied: ${data.body}`,
            })
          }
        } else {
          // Find assignee or fallback to all admins
          let emails: string[] = []
          if (ticket.assignedToUserId) {
            const assignee = await tx.query.users.findFirst({
              where: eq(users.id, ticket.assignedToUserId),
            })
            if (assignee) emails.push(assignee.email)
          } else {
            const adminUsers = await tx
              .select({ email: users.email })
              .from(memberships)
              .innerJoin(users, eq(users.id, memberships.userId))
              .where(
                and(
                  eq(memberships.tenantId, tenantId),
                  or(eq(memberships.role, 'admin'), eq(memberships.role, 'owner')),
                ),
              )
            emails = adminUsers.map((a: { email: string }) => a.email)
          }

          for (const email of emails) {
            await emailQueue.add('send-email', {
              to: email,
              subject: `[Ticket Response] Customer replied`,
              body: `The customer replied: ${data.body}`,
            })
          }
        }
      }

      return comment
    })
  }
}
