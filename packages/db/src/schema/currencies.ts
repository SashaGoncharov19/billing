import { pgTable, uuid, varchar, numeric, timestamp, boolean, pgEnum, jsonb } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const currencies = pgTable('currencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 10 }).notNull(), // e.g. USD, UAH
  symbol: varchar('symbol', { length: 5 }).notNull(), // e.g. $, ₴
  exchangeRate: numeric('exchange_rate', { precision: 16, scale: 6 }).notNull().default('1.000000'),
  isBaseCurrency: boolean('is_base_currency').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Currency = typeof currencies.$inferSelect
export type NewCurrency = typeof currencies.$inferInsert
