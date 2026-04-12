import { db, idempotencyKeys } from '@entityseven/db'
import { eq, and } from 'drizzle-orm'

export async function checkIdempotency(key: string, scope: string = 'webhook'): Promise<boolean> {
  const existing = await db.query.idempotencyKeys.findFirst({
    where: and(
      eq(idempotencyKeys.key, key),
      eq(idempotencyKeys.scope, scope)
    )
  })

  if (existing) {
    return false
  }

  await db.insert(idempotencyKeys).values({
    key,
    scope,
    responseHash: 'pending',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  })

  return true
}
