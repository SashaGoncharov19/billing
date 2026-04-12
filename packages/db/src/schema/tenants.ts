import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core'

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(), // URL-friendly ідентифікатор
  logoUrl: text('logo_url'),
  primaryColor: varchar('primary_color', { length: 7 }),    // HEX напр. #3B82F6
  secondaryColor: varchar('secondary_color', { length: 7 }),
  customCss: text('custom_css'),                             // кастомний CSS для white-label
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
