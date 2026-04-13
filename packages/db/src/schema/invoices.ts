import { pgTable, uuid, varchar, numeric, timestamp, pgEnum, index, integer, unique, jsonb } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'open', 'paid', 'void', 'uncollectible'])

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  number: integer('number'),               // sequential per tenant, null for drafts
  status: invoiceStatusEnum('status').default('draft').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  subtotalAmount: numeric('subtotal_amount', { precision: 12, scale: 2 }).notNull(),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  notes: varchar('notes', { length: 2000 }),
  pdfUrl: varchar('pdf_url', { length: 2000 }),      // S3/R2 URL
  issuerDetails: jsonb('issuer_details'),            // Frozen tenant snapshot
  recipientDetails: jsonb('recipient_details'),      // Frozen user snapshot
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  dueAt: timestamp('due_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique().on(table.tenantId, table.number),
  index('invoices_tenant_idx').on(table.tenantId),
  index('invoices_status_idx').on(table.status),
])

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
