import { Worker } from 'bullmq'
import { bullMqConnection } from '../client'

const dlqWorker = new Worker('dead-letter', async (job) => {
  console.error(`[DLQ WORKER] Critical failure processing job:`, job.data)
  // Alert admin or track metrics
}, { connection: bullMqConnection })

dlqWorker.on('failed', (job, error) => {
  console.error(`[DLQ WORKER] Even DLQ failed!`, error.message)
})
