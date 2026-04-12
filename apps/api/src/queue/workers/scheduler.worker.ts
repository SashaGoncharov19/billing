import { Worker } from 'bullmq'
import { bullMqConnection } from '../client'
import { schedulerQueue } from '../index'
import { db, tickets, idempotencyKeys } from '@entityseven/db'
import { and, eq, lte } from 'drizzle-orm'

// Register cron jobs once
export async function initScheduler() {
  await schedulerQueue.add(
    'auto-close-tickets',
    {},
    {
      repeat: { pattern: '0 2 * * *' }, // Daily at 02:00
      jobId: 'auto-close-tickets',
    }
  )

  await schedulerQueue.add(
    'cleanup-idempotency-keys',
    {},
    {
      repeat: { pattern: '0 3 * * *' }, // Daily at 03:00
      jobId: 'cleanup-idempotency-keys',
    }
  )
}

async function autoCloseTickets() {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const result = await db.update(tickets)
    .set({ status: 'closed', closedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(tickets.status, 'resolved'),
        lte(tickets.resolvedAt, sevenDaysAgo)
      )
    )
    .returning({ id: tickets.id })

  if (result.length > 0) {
    console.log(`[SCHEDULER] Auto-closed ${result.length} resolved tickets.`)
  }
}

async function cleanupIdempotencyKeys() {
  const now = new Date()

  const deleted = await db.delete(idempotencyKeys)
    .where(lte(idempotencyKeys.expiresAt, now))
    .returning({ id: idempotencyKeys.id })

  if (deleted.length > 0) {
    console.log(`[SCHEDULER] Cleaned up ${deleted.length} expired idempotency keys.`)
  }
}

const schedulerWorker = new Worker('scheduler', async (job) => {
  switch (job.name) {
    case 'auto-close-tickets':
      console.log(`[SCHEDULER] Running auto-close tickets...`)
      await autoCloseTickets()
      break
    case 'cleanup-idempotency-keys':
      console.log(`[SCHEDULER] Running idempotency keys cleanup...`)
      await cleanupIdempotencyKeys()
      break
    default:
      console.error(`Unknown scheduler job: ${job.name}`)
  }
}, { connection: bullMqConnection, concurrency: 1 })

schedulerWorker.on('failed', (job, error) => {
  console.error(`[SCHEDULER] Job ${job?.id} failed:`, error.message)
})
