import { pgTable, uuid, varchar, text, timestamp, index, unique } from 'drizzle-orm/pg-core'

export const idempotencyKeys = pgTable('idempotency_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 255 }).notNull(),
  scope: varchar('scope', { length: 100 }).notNull(),  // напр. 'payment', 'invoice'
  responseHash: text('response_hash').notNull(),         // hash відповіді для повторення
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique().on(table.key, table.scope),
  index('idempotency_keys_expires_idx').on(table.expiresAt),
])

export type IdempotencyKey = typeof idempotencyKeys.$inferSelect
