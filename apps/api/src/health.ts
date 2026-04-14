import { Elysia } from 'elysia'
import { db } from '@entityseven/db'
import { sql } from 'drizzle-orm'
import pkg from '../package.json'
import { emailQueue } from '@api/queue'

// Simple redis ping function using active queue connection
const pingRedis = async () => {
  const client = await emailQueue.client
  return client.ping()
}

export const healthRouter = new Elysia().get('/health', async () => {
  const start = Date.now()
  const checks = await Promise.allSettled([
    db.execute(sql`SELECT 1`),
    pingRedis(),
    emailQueue.count(),
  ])

  const [dbCheck, redisCheck, queueCount] = checks
  const uptime = process.uptime()

  return {
    status: checks.every((c) => c.status === 'fulfilled') ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: pkg.version,
    uptime,
    services: {
      database:
        dbCheck.status === 'fulfilled'
          ? { status: 'ok', latency: Date.now() - start }
          : { status: 'error' },
      redis:
        redisCheck.status === 'fulfilled'
          ? { status: 'ok', latency: Date.now() - start }
          : { status: 'error' },
      queue:
        queueCount.status === 'fulfilled'
          ? { status: 'ok', size: queueCount.value }
          : { status: 'error' },
    },
  }
})
