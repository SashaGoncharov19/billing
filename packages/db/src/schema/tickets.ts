import { pgTable, uuid, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'])
export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'medium', 'high', 'critical'])

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
  assignedToUserId: uuid('assigned_to_user_id').references(() => users.id),  // admin user
  subject: varchar('subject', { length: 500 }).notNull(),
  body: text('body').notNull(),
  status: ticketStatusEnum('status').default('open').notNull(),
  priority: ticketPriorityEnum('priority').default('medium').notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('tickets_tenant_idx').on(table.tenantId),
  index('tickets_status_idx').on(table.status),
  index('tickets_assignee_idx').on(table.assignedToUserId),
])

export type Ticket = typeof tickets.$inferSelect
export type NewTicket = typeof tickets.$inferInsert
