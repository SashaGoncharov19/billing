import { Worker } from 'bullmq'
import { bullMqConnection } from '../client'
import { schedulerQueue } from '../index'
import { db, tickets, idempotencyKeys, currencies, services, tenants, balanceLogs } from '@entityseven/db'
import { and, eq, lte, ne } from 'drizzle-orm'

// Register cron jobs once
export async function initScheduler() {
  await schedulerQueue.add(
    'auto-close-tickets',
    {},
    {
      repeat: { pattern: '0 2 * * *' }, // Daily at 02:00
      jobId: 'auto-close-tickets',
    },
  )

  await schedulerQueue.add(
    'cleanup-idempotency-keys',
    {},
    {
      repeat: { pattern: '0 3 * * *' }, // Daily at 03:00
      jobId: 'cleanup-idempotency-keys',
    },
  )

  await schedulerQueue.add(
    'update-exchange-rates',
    {},
    {
      repeat: { pattern: '0 * * * *' }, // Hourly
      jobId: 'update-exchange-rates',
    },
  )

  await schedulerQueue.add(
    'hourly-service-metering',
    {},
    {
      repeat: { pattern: '0 * * * *' }, // Hourly
      jobId: 'hourly-service-metering',
    },
  )
}

async function autoCloseTickets() {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const result = await db
    .update(tickets)
    .set({ status: 'closed', closedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(tickets.status, 'resolved'), lte(tickets.resolvedAt, sevenDaysAgo)))
    .returning({ id: tickets.id })

  if (result.length > 0) {
    console.log(`[SCHEDULER] Auto-closed ${result.length} resolved tickets.`)
  }
}

async function cleanupIdempotencyKeys() {
  const now = new Date()

  const deleted = await db
    .delete(idempotencyKeys)
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
      where: eq(currencies.isBaseCurrency, true),
    })

    const baseCode = baseCurrency ? baseCurrency.code : 'USD'

    // Using open endpoint for exchange rates
    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCode}`)
    if (!response.ok) throw new Error(`API returned ${response.status}`)
    const data = await response.json()

    if (data && data.rates) {
      const allCurrencies = await db.query.currencies.findMany({
        where: ne(currencies.code, baseCode),
      })

      for (const curr of allCurrencies) {
        if (data.rates[curr.code]) {
          await db
            .update(currencies)
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

async function runHourlyServiceMetering() {
  console.log(`[SCHEDULER] Running hourly service metering...`)
  try {
    const activeServices = await db.query.services.findMany({
      where: eq(services.status, 'active')
    })

    for (const service of activeServices) {
      const hourlyPrice = Number(service.hourlyPrice)
      if (hourlyPrice <= 0) continue

      await db.transaction(async tx => {
        const tenant = await tx.query.tenants.findFirst({ where: eq(tenants.id, service.tenantId) })
        if (!tenant) return

        let currentBalance = Number(tenant.accountBalance)
        let deduction = hourlyPrice

        // If balance hits zero, we should maybe suspend
        // Easiest is to deduct and check if < 0.
        let newBalance = currentBalance - deduction
        
        await tx.update(tenants).set({ accountBalance: newBalance.toFixed(2) }).where(eq(tenants.id, tenant.id))
        
        await tx.insert(balanceLogs).values({
          tenantId: tenant.id,
          amount: (-deduction).toFixed(4),
          balanceAfter: newBalance.toFixed(2),
          type: 'hourly_usage',
          referenceId: service.id,
          description: `Hourly active usage charge for ${service.name}`,
        })
        
        // Update last billed at so if they delete it, fraction is correct
        await tx.update(services).set({ lastBilledAt: new Date() }).where(eq(services.id, service.id))

        if (newBalance < 0) {
          console.log(`[METERING] Tenant ${tenant.id} balance below 0. Suspending service ${service.id}`)
          await tx.update(services).set({ status: 'suspended' }).where(eq(services.id, service.id))
        }
      })
    }
  } catch(error) {
    console.error(`[SCHEDULER] Failed hourly metering:`, error)
  }
}

const schedulerWorker = new Worker(
  'scheduler',
  async (job) => {
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
      case 'hourly-service-metering':
        await runHourlyServiceMetering()
        break
      default:
        console.error(`Unknown scheduler job: ${job.name}`)
    }
  },
  { connection: bullMqConnection, concurrency: 1 },
)

schedulerWorker.on('failed', (job, error) => {
  console.error(`[SCHEDULER] Job ${job?.id} failed:`, error.message)
})
