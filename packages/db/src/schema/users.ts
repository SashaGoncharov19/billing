import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const themeEnum = pgEnum('theme', ['light', 'dark'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  preferredLanguage: varchar('preferred_language', { length: 10 }).default('en').notNull(),
  theme: themeEnum('theme').default('light').notNull(),
  billingName: varchar('billing_name', { length: 255 }),
  billingAddress: text('billing_address'),
  billingTaxId: varchar('billing_tax_id', { length: 100 }),
  billingEmail: varchar('billing_email', { length: 255 }),
  billingCountry: varchar('billing_country', { length: 2 }), // ISO-3166-1 alpha-2
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),  // soft delete
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
