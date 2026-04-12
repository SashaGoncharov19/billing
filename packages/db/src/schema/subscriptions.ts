import { pgTable, uuid, varchar, timestamp, pgEnum, jsonb, index, boolean } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { products } from './products'

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'
])

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  productId: uuid('product_id').references(() => products.id),
  provider: varchar('provider', { length: 50 }).notNull(),              // 'stripe'
  providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }).notNull().unique(),
  providerData: jsonb('provider_data'),
  status: subscriptionStatusEnum('status').notNull(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('subscriptions_tenant_idx').on(table.tenantId),
])

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
