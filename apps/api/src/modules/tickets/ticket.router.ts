import { Elysia, t } from 'elysia'
import { TicketService } from './ticket.service'
import {
  CreateTicketDto,
  UpdateTicketDto,
  CreateCommentDto,
  QueryTicketsDto,
} from './ticket.schema'
import { authenticate } from '@api/middleware/authenticate'
import { resolveTenant } from '@api/middleware/tenant'

export const ticketRouter = new Elysia({ prefix: '/tickets' })
  .use(authenticate)
  .use(resolveTenant)
  .decorate('ticketService', new TicketService())
  .get(
    '/',
    async ({ tenant, user, query, ticketService }) => {
      return ticketService.getTickets(tenant.id, user.id, user.role || 'member', {
        status: query.status,
        priority: query.priority,
        assignedToMe: query.assignedToMe,
        limit: query.limit,
      })
    },
    { query: QueryTicketsDto },
  )
  .get(
    '/:id',
    async ({ params: { id }, tenant, user, ticketService }) => {
      return ticketService.getTicketById(tenant.id, id, user.id, user.role || 'member')
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    '/',
    async ({ body, tenant, user, ticketService }) => {
      return ticketService.createTicket(tenant.id, user.id, body)
    },
    { body: CreateTicketDto },
  )
  .patch(
    '/:id',
    async ({ params: { id }, body, tenant, user, set, ticketService }) => {
      if (user.role !== 'admin' && user.role !== 'owner') {
        set.status = 403
        return { code: 'FORBIDDEN', message: 'Only admins can update tickets' }
      }
      return ticketService.updateTicket(tenant.id, id, body, user.role || 'member')
    },
    { body: UpdateTicketDto, params: t.Object({ id: t.String() }) },
  )
  .post(
    '/:id/comments',
    async ({ params: { id }, body, tenant, user, ticketService }) => {
      return ticketService.addComment(tenant.id, id, user.id, user.role || 'member', body)
    },
    { body: CreateCommentDto, params: t.Object({ id: t.String() }) },
  )
