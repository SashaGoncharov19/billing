import { Elysia, t } from 'elysia'
import { TicketService } from './ticket.service'
import { CreateTicketDto, UpdateTicketDto, CreateCommentDto, QueryTicketsDto } from './ticket.schema'
import { authenticate } from '../../middleware/authenticate'
import { resolveTenant } from '../../middleware/tenant'

export const ticketRouter = new Elysia({ prefix: '/api/v1/tickets' })
  .use(authenticate)
  .use(resolveTenant)
  .decorate('ticketService', new TicketService())
  .get('/', async ({ tenant, user, query, ticketService }) => {
    return ticketService.getTickets(
      tenant.id, 
      user.id, 
      user.role || 'member', 
      {
        status: query.status,
        priority: query.priority,
        // Using !! ensures passing properly for exactOptionalPropertyTypes if we needed boolean logic,
        // but now that we accept boolean | undefined, query.assignedToMe is fine. 
        // t.BooleanString() parses strings to boolean automatically!
        assignedToMe: query.assignedToMe, 
        limit: query.limit
      }
    )
  }, { query: QueryTicketsDto })
  .get('/:id', async ({ params: { id }, tenant, user, ticketService }) => {
    return ticketService.getTicketById(tenant.id, id, user.id, user.role || 'member')
  }, { params: t.Object({ id: t.String() }) })
  .post('/', async ({ body, tenant, user, ticketService }) => {
    return ticketService.createTicket(tenant.id, user.id, body)
  }, { body: CreateTicketDto })
  .patch('/:id', async ({ params: { id }, body, tenant, user, set, ticketService }) => {
    if (user.role !== 'admin' && user.role !== 'owner') {
      set.status = 403
      return { code: 'FORBIDDEN', message: 'Only admins can update tickets' }
    }
    return ticketService.updateTicket(tenant.id, id, body)
  }, { body: UpdateTicketDto, params: t.Object({ id: t.String() }) })
  .post('/:id/comments', async ({ params: { id }, body, tenant, user, ticketService }) => {
    return ticketService.addComment(tenant.id, id, user.id, user.role || 'member', body)
  }, { body: CreateCommentDto, params: t.Object({ id: t.String() }) })
