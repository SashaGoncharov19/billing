import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core'

export const appSettings = pgTable('app_settings', {
  id: varchar('id', { length: 50 }).primaryKey(), // Hardcoded to 'global'
  billingEntity: varchar('billing_entity', { length: 255 }),
  billingAddress: text('billing_address'),
  billingTaxId: varchar('billing_tax_id', { length: 100 }),
  billingEmail: varchar('billing_email', { length: 255 }),
  billingCountry: varchar('billing_country', { length: 2 }), // ISO-3166-1 alpha-2
  logoUrl: text('logo_url'),
  primaryColor: varchar('primary_color', { length: 7 }),    // HEX
  secondaryColor: varchar('secondary_color', { length: 7 }),
  customCss: text('custom_css'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type AppSettings = typeof appSettings.$inferSelect
export type NewAppSettings = typeof appSettings.$inferInsert
