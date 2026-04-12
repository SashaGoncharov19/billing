import { db } from '@entityseven/db'
import { sql as drizzleSql } from 'drizzle-orm'

export const testDb = db

export async function resetDb() {
  await db.execute(drizzleSql`
    TRUNCATE TABLE
      users, tenants, memberships, invoices, invoice_items,
      subscriptions, products, tickets, ticket_comments,
      audit_logs, idempotency_keys
    RESTART IDENTITY CASCADE
  `)
}
