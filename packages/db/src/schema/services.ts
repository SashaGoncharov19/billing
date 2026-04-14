import { pgTable, uuid, varchar, timestamp, pgEnum, jsonb, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { products } from './products'

export const serviceStatusEnum = pgEnum('service_status', [
  'pending', 'active', 'suspended', 'canceled'
])

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  name: varchar('name', { length: 255 }).notNull(), // Snapshot of product name so it stands if product is modified
  provider: varchar('provider', { length: 50 }).notNull(), // 'stripe' | 'manual'
  providerReferenceId: varchar('provider_reference_id', { length: 255 }), // invoiceId or paymentIntentId
  status: serviceStatusEnum('status').notNull().default('pending'),
  monthlyPrice: varchar('monthly_price', { length: 50 }).notNull().default('0'), // Snapshotted at purchase
  hourlyPrice: varchar('hourly_price', { length: 50 }).notNull().default('0'), // (Monthly / 730) snapshotted
  pluginData: jsonb('plugin_data'),
  lastBilledAt: timestamp('last_billed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('services_tenant_idx').on(table.tenantId),
])

export type Service = typeof services.$inferSelect
export type NewService = typeof services.$inferInsert
