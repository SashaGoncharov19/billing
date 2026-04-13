import { pgTable, uuid, varchar, text, boolean, pgEnum, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const paymentMethodTypeEnum = pgEnum('payment_method_type', ['gateway', 'manual'])

export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(), // e.g. Stripe, Cash
  identifier: varchar('identifier', { length: 100 }).notNull(), // e.g. 'stripe', 'cash_manual'
  type: paymentMethodTypeEnum('type').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  instructions: text('instructions'), // Used for manual methods mostly to show to client
  config: jsonb('config'), // specific gateway config if needed
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type PaymentMethod = typeof paymentMethods.$inferSelect
export type NewPaymentMethod = typeof paymentMethods.$inferInsert
