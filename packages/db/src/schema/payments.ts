import { pgTable, uuid, varchar, numeric, timestamp, pgEnum, jsonb, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { invoices } from './invoices'

export const paymentProviderEnum = pgEnum('payment_provider', ['stripe', 'manual'])
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'succeeded', 'failed', 'refunded'])

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  provider: paymentProviderEnum('provider').notNull(),
  providerPaymentId: varchar('provider_payment_id', { length: 255 }),  // Stripe payment_intent_id
  providerData: jsonb('provider_data'),                                  // raw provider response
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  status: paymentStatusEnum('status').default('pending').notNull(),
  failureReason: varchar('failure_reason', { length: 500 }),
  refundedAmount: numeric('refunded_amount', { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('payments_tenant_idx').on(table.tenantId),
  index('payments_invoice_idx').on(table.invoiceId),
  index('payments_provider_payment_idx').on(table.providerPaymentId),
])

export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
