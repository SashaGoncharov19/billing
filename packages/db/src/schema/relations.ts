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

import { memberships } from './memberships'
import { tenants } from './tenants'
import { users } from './users'

export const membershipRelations = relations(memberships, ({ one }) => ({
  tenant: one(tenants, {
    fields: [memberships.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
}))

export const tenantRelations = relations(tenants, ({ many }) => ({
  memberships: many(memberships),
  tickets: many(tickets),
}))

export const userRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  tickets: many(tickets),
}))

import { tickets } from './tickets'

export const ticketRelations = relations(tickets, ({ one }) => ({
  createdByUser: one(users, {
    fields: [tickets.createdByUserId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [tickets.tenantId],
    references: [tenants.id],
  }),
}))
