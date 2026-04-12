import { logger } from './lib/logger'

// Import all queue workers — their BullMQ connections keep the process alive
import './queue/workers/email.worker'
import './queue/workers/pdf.worker'
import './queue/workers/webhook.worker'
import './queue/workers/dlq.worker'
import { initScheduler } from './queue/workers/scheduler.worker'

logger.info('🚀 Entity Seven Worker Instance Started')

initScheduler().catch((e) => {
  logger.error({ error: e }, 'Failed to init scheduler')
})

process.on('SIGINT', () => {
  logger.info('Shutting down worker process...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('Shutting down worker process...')
  process.exit(0)
})
