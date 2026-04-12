import { pgTable, uuid, varchar, jsonb, timestamp, index, text } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').references(() => users.id),  // null для system actions
  action: varchar('action', { length: 255 }).notNull(),  // напр. 'invoice.created', 'user.login'
  resourceType: varchar('resource_type', { length: 100 }),  // напр. 'invoice', 'payment'
  resourceId: uuid('resource_id'),
  metadata: jsonb('metadata'),    // додаткові дані (diff, IP, user agent)
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('audit_logs_tenant_idx').on(table.tenantId),
  index('audit_logs_action_idx').on(table.action),
  index('audit_logs_created_at_idx').on(table.createdAt),
])

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
