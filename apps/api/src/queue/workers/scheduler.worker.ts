import { Worker } from 'bullmq'
import { bullMqConnection } from '../client'
import { schedulerQueue } from '../index'
import { db, tickets, idempotencyKeys, currencies } from '@entityseven/db'
import { and, eq, lte, ne } from 'drizzle-orm'

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

  await schedulerQueue.add(
    'update-exchange-rates',
    {},
    {
      repeat: { pattern: '0 * * * *' }, // Hourly
      jobId: 'update-exchange-rates',
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

async function updateExchangeRates() {
  console.log(`[SCHEDULER] Fetching live exchange rates...`)
  try {
    const baseCurrency = await db.query.currencies.findFirst({
      where: eq(currencies.isBaseCurrency, true)
    })

    const baseCode = baseCurrency ? baseCurrency.code : 'USD'
    
    // Using open endpoint for exchange rates
    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCode}`)
    if (!response.ok) throw new Error(`API returned ${response.status}`)
    const data = await response.json()

    if (data && data.rates) {
      const allCurrencies = await db.query.currencies.findMany({
        where: ne(currencies.code, baseCode)
      })

      for (const curr of allCurrencies) {
        if (data.rates[curr.code]) {
          await db.update(currencies)
            .set({ exchangeRate: data.rates[curr.code].toString(), updatedAt: new Date() })
            .where(eq(currencies.id, curr.id))
        }
      }
      console.log(`[SCHEDULER] Updated rates for ${allCurrencies.length} currencies.`)
    }
  } catch (error) {
    console.error(`[SCHEDULER] Failed to update exchange rates:`, error)
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
    case 'update-exchange-rates':
      await updateExchangeRates()
      break
    default:
      console.error(`Unknown scheduler job: ${job.name}`)
  }
}, { connection: bullMqConnection, concurrency: 1 })

schedulerWorker.on('failed', (job, error) => {
  console.error(`[SCHEDULER] Job ${job?.id} failed:`, error.message)
})
