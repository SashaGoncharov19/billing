import { pgTable, uuid, varchar, numeric, timestamp, pgEnum, index, boolean, jsonb } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const billingTypeEnum = pgEnum('billing_type', ['one_time', 'recurring'])
export const billingIntervalEnum = pgEnum('billing_interval', ['month', 'year'])

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).default('0').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  billingType: billingTypeEnum('billing_type').default('one_time').notNull(),
  billingInterval: billingIntervalEnum('billing_interval'),  // null for one_time
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  pluginType: varchar('plugin_type', { length: 100 }), // e.g., 'keyhelp'
  pluginConfig: jsonb('plugin_config'), // JSON configuration for the plugin
  isActive: boolean('is_active').default(true).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('products_tenant_idx').on(table.tenantId),
])

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
