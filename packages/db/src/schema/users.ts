import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const themeEnum = pgEnum('theme', ['light', 'dark'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  preferredLanguage: varchar('preferred_language', { length: 10 }).default('en').notNull(),
  theme: themeEnum('theme').default('light').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),  // soft delete
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
