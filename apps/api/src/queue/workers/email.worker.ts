import { Worker } from 'bullmq'
import { bullMqConnection } from '../client'
import type { EmailJob } from '../types'
import { sendEmail } from '../../lib/email'

const emailWorker = new Worker<EmailJob>(
  'emails',
  async (job) => {
    const { type, data } = job.data

    switch (type) {
      case 'send-invoice-notification':
        await sendEmail({
          to: data.recipientEmail,
          subject: `Invoice #${data.invoiceNumber}`,
          html: `<p>Your invoice for ${data.totalAmount} ${data.currency} is ready.</p>`,
        })
        break
      case 'send-ticket-notification':
        await sendEmail({
          to: data.recipientEmails,
          subject: `Ticket Update: ${data.ticketSubject}`,
          html: `<p>Ticket status: ${data.newStatus || data.eventType}</p>`,
        })
        break
      case 'send-payment-receipt':
        await sendEmail({
          to: data.recipientEmail,
          subject: `Payment Receipt: Invoice #${data.invoiceNumber}`,
          html: `<p>Payment received for ${data.amount} ${data.currency}</p>`,
        })
        break
      default:
        throw new Error(`Unknown email job type: ${type}`)
    }
  },
  {
    connection: bullMqConnection,
    concurrency: 5,
  }
)

emailWorker.on('failed', (job, error) => {
  console.error(`[EMAIL WORKER] Job ${job?.id} failed:`, error.message)
})

emailWorker.on('completed', (job) => {
  console.log(`[EMAIL WORKER] Job ${job.id} completed`)
})
