import { t } from 'elysia'

export const CreateTicketDto = t.Object({
  subject: t.String({ minLength: 1, maxLength: 500 }),
  body: t.String({ minLength: 1 }),
  priority: t.Optional(t.Union([
    t.Literal('low'),
    t.Literal('medium'),
    t.Literal('high'),
    t.Literal('critical')
  ]))
})

export const UpdateTicketDto = t.Object({
  status: t.Optional(t.Union([
    t.Literal('open'),
    t.Literal('in_progress'),
    t.Literal('waiting_customer'),
    t.Literal('resolved'),
    t.Literal('closed')
  ])),
  priority: t.Optional(t.Union([
    t.Literal('low'),
    t.Literal('medium'),
    t.Literal('high'),
    t.Literal('critical')
  ])),
  assignedToUserId: t.Optional(t.Union([t.String(), t.Null()])),
})

export const CreateCommentDto = t.Object({
  body: t.String({ minLength: 1 }),
  isInternal: t.Optional(t.Boolean())
})

export const QueryTicketsDto = t.Object({
  status: t.Optional(t.String()),
  priority: t.Optional(t.String()),
  assignedToMe: t.Optional(t.BooleanString()),
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Numeric({ default: 20, maximum: 100 })),
})
