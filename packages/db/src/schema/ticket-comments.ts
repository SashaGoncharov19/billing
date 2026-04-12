import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { tickets } from './tickets'
import { users } from './users'

export const ticketComments = pgTable('ticket_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  isInternal: boolean('is_internal').default(false).notNull(),  // internal notes (admin-only)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ticket_comments_ticket_idx').on(table.ticketId),
])

export type TicketComment = typeof ticketComments.$inferSelect
export type NewTicketComment = typeof ticketComments.$inferInsert
