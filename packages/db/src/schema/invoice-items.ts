import { pgTable, uuid, varchar, numeric, integer, index } from 'drizzle-orm/pg-core'
import { invoices } from './invoices'
import { products } from './products'

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id),  // nullable (custom line item)
  description: varchar('description', { length: 500 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).default('0').notNull(),  // 0.2 = 20%
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
}, (table) => [
  index('invoice_items_invoice_idx').on(table.invoiceId),
])

export type InvoiceItem = typeof invoiceItems.$inferSelect
export type NewInvoiceItem = typeof invoiceItems.$inferInsert
