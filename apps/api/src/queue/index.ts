import { Queue } from 'bullmq'
import { bullMqConnection } from './client'

export const emailQueue = new Queue('emails', {
  connection: bullMqConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
})

export const pdfQueue = new Queue('pdf-generation', {
  connection: bullMqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
})

export const webhookQueue = new Queue('webhook-processing', {
  connection: bullMqConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 1000 },
  },
})

export const schedulerQueue = new Queue('scheduler', {
  connection: bullMqConnection,
})

export const dlqQueue = new Queue('dead-letter', {
  connection: bullMqConnection,
})
