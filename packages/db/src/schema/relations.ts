import { relations } from 'drizzle-orm'
import { invoices } from './invoices'
import { invoiceItems } from './invoice-items'

export const invoiceRelations = relations(invoices, ({ many }) => ({
  items: many(invoiceItems),
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}))
