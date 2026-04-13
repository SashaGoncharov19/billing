import { pgTable, uuid, varchar, numeric, timestamp, unique, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const taxRates = pgTable('tax_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  countryCode: varchar('country_code', { length: 2 }).notNull(), // ISO 3166-1 alpha-2 e.g. 'US', 'DE', 'UA'
  taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).notNull(), // Maximum 9.9999 (999.99%) - usually 0.2000 for 20%
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('tax_rates_tenant_country_idx').on(table.tenantId, table.countryCode),
  index('tax_rates_country_idx').on(table.countryCode),
])

export type TaxRate = typeof taxRates.$inferSelect
export type NewTaxRate = typeof taxRates.$inferInsert
