import { Worker } from 'bullmq'
import { bullMqConnection } from '../client'
import type { EmailJob } from '../types'
import { sendEmail } from '@api/lib/email'

const emailWorker = new Worker<EmailJob>(
  'emails',
  async (job) => {
    const type = job.data?.type || job.name
    const payload = job.data

    switch (type) {
      case 'send-email': {
        const data = (payload.data || payload) as unknown as Extract<
          EmailJob,
          { type: 'send-email' }
        >['data']
        await sendEmail({
          to: data.to,
          subject: data.subject,
          html: `<p>${String(data.body || data.html || '').replace(/\n/g, '<br/>')}</p>`,
        })
        break
      }
      case 'send-invoice-notification': {
        const data = (payload.data || payload) as unknown as Extract<
          EmailJob,
          { type: 'send-invoice-notification' }
        >['data']
        await sendEmail({
          to: data.recipientEmail,
          subject: `Invoice #${data.invoiceNumber}`,
          html: `<p>Your invoice for ${data.totalAmount} ${data.currency} is ready.</p>`,
        })
        break
      }
      case 'send-ticket-notification': {
        const data = (payload.data || payload) as unknown as Extract<
          EmailJob,
          { type: 'send-ticket-notification' }
        >['data']
        await sendEmail({
          to: data.recipientEmails,
          subject: `Ticket Update: ${data.ticketSubject}`,
          html: `<p>Ticket status: ${data.newStatus || data.eventType}</p>`,
        })
        break
      }
      case 'send-payment-receipt': {
        const data = (payload.data || payload) as unknown as Extract<
          EmailJob,
          { type: 'send-payment-receipt' }
        >['data']
        await sendEmail({
          to: data.recipientEmail,
          subject: `Payment Receipt: Invoice #${data.invoiceNumber}`,
          html: `<p>Payment received for ${data.amount} ${data.currency}</p>`,
        })
        break
      }
      default:
        throw new Error(`Unknown email job type: ${type}`)
    }
  },
  {
    connection: bullMqConnection,
    concurrency: 5,
  },
)

emailWorker.on('failed', (job, error) => {
  console.error(`[EMAIL WORKER] Job ${job?.id} failed:`, error.message)
})

emailWorker.on('completed', (job) => {
  console.log(`[EMAIL WORKER] Job ${job.id} completed`)
})
