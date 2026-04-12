import { db, sql } from '@entityseven/db'

export async function resetDb() {
  const tables = [
    'audit_logs',
    'idempotency_keys',
    'ticket_comments',
    'tickets',
    'payments',
    'invoice_items',
    'invoices',
    'subscriptions',
    'products',
    'memberships',
    'tenants',
    'users'
  ]

  for (const table of tables) {
    try {
      await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`))
    } catch (e: any) {
      if (e.code !== '42P01') { // Ignore undefined table
        throw e
      }
    }
  }
}
