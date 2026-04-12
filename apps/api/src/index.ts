import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { config } from './config'
import pkg from '../package.json'
import { requestIdMiddleware } from './middleware/request-id'
import { requestLogger } from './middleware/request-logger'
import { errorHandler } from './middleware/error-handler'
import { apiVersionMiddleware } from './middleware/api-version'
import { healthRouter } from './health'
import { authRouter } from "./modules/auth/auth.router"
import { tenantRouter } from './modules/tenants/tenant.router'
import { billingRouter, webhookRouter } from './modules/billing/billing.router'
import { productsRouter } from './modules/products/products.router'
import { invoiceRouter } from './modules/invoices/invoice.router'
import { ticketRouter } from './modules/tickets/ticket.router'
import { adminRouter } from './modules/admin/admin.router'
import { bullBoard } from './queue/bull-board'
import { getMetrics } from './lib/metrics'
import { logger } from './lib/logger'

import './queue/workers/email.worker'
import './queue/workers/pdf.worker'
import './queue/workers/webhook.worker'
import './queue/workers/dlq.worker'
import { initScheduler } from './queue/workers/scheduler.worker'

// Initialize CRON jobs
if (process.env.NODE_ENV !== 'test') {
  initScheduler().catch((e) => logger.error({ error: e }, 'Failed to init scheduler'))
}

export const app = new Elysia()
  // Global middleware
  .use(cors({
    origin: config.ALLOWED_ORIGINS.split(','),
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id', 'X-Idempotency-Key', 'X-API-Version'],
  }))
  .use(swagger({
    path: '/docs',
    documentation: {
      info: {
        title: 'Entity Seven API',
        version: pkg.version, 
        description: 'Entity Seven SaaS Billing Platform API',
      },
    },
  }))
  .use(requestIdMiddleware)
  .use(requestLogger)
  .use(apiVersionMiddleware) 
  .use(errorHandler)

  .use(healthRouter)
  .use(webhookRouter)

  .get('/metrics', () => getMetrics()) // Private endpoints later guarded by proxy/ip

  .use(authRouter)
  .use(tenantRouter)
  .use(billingRouter)
  .use(productsRouter)
  .use(invoiceRouter)
  .use(ticketRouter)

  .use(adminRouter) 

  // Bull MQ Dashboard
  .use((app) => process.env.NODE_ENV === 'test' ? app : app.use(bullBoard.registerPlugin()))

  .listen(config.API_PORT)

logger.info(`🚀 Entity Seven API running at http://localhost:${config.API_PORT}`)
logger.info(`📚 API docs: http://localhost:${config.API_PORT}/docs`)

export type App = typeof app
