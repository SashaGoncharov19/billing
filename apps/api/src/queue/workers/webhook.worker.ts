import { Worker } from 'bullmq'
import { bullMqConnection } from '../client'
import type { ProcessStripeWebhookJob } from '../types'
import { handleWebhookEvent } from '../../providers/stripe/stripe.webhooks'

const webhookWorker = new Worker<ProcessStripeWebhookJob>(
  'webhook-processing',
  async (job) => {
    const { eventId, eventType, rawData } = job.data

    console.log(`[WEBHOOK WORKER] Processing Stripe event ${eventId} of type ${eventType}`)
    
    // Completely process the event via the central robust webhook handler
    await handleWebhookEvent({
      type: eventType,
      providerId: eventId,
      data: rawData
    })
  },
  {
    connection: bullMqConnection,
    concurrency: 3,
  }
)

webhookWorker.on('failed', (job, error) => {
  console.error(`[WEBHOOK] Job ${job?.id} failed:`, error.message)
})
