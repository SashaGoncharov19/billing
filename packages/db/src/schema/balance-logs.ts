import { pgTable, uuid, numeric, varchar, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const balanceLogs = pgTable('balance_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(), // positive for top-up, negative for deduction
  balanceAfter: numeric('balance_after', { precision: 12, scale: 2 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'top_up', 'hourly_usage', 'first_hour_charge', 'deletion_charge', 'refund'
  referenceId: varchar('reference_id', { length: 255 }), // serviceId, or stripe payment_intent ID
  description: varchar('description', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('balance_logs_tenant_idx').on(table.tenantId),
  index('balance_logs_type_idx').on(table.type),
])

export type BalanceLog = typeof balanceLogs.$inferSelect
export type NewBalanceLog = typeof balanceLogs.$inferInsert
