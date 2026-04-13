export interface SendInvoiceNotificationJob {
  type: 'send-invoice-notification'
  data: {
    invoiceId: string
    tenantId: string
    recipientEmail: string
    invoiceNumber: number
    totalAmount: string
    currency: string
    dueAt: string
    pdfUrl?: string
  }
}

export interface SendTicketNotificationJob {
  type: 'send-ticket-notification'
  data: {
    ticketId: string
    tenantId: string
    eventType: 'created' | 'status_changed' | 'comment_added' | 'assigned'
    recipientEmails: string[]
    ticketSubject: string
    newStatus?: string
    commenterName?: string
  }
}

export interface SendPaymentReceiptJob {
  type: 'send-payment-receipt'
  data: {
    paymentId: string
    tenantId: string
    recipientEmail: string
    amount: string
    currency: string
    invoiceNumber: number
  }
}

export interface SendEmailJob {
  type: 'send-email'
  data: {
    to: string | string[]
    subject: string
    body?: string
    html?: string
  }
}

export type EmailJob =
  | SendInvoiceNotificationJob
  | SendTicketNotificationJob
  | SendPaymentReceiptJob
  | SendEmailJob


export interface GenerateInvoicePdfJob {
  type: 'invoice'
  data: {
    invoiceId: string
    tenantId: string
  }
}

export type PdfJob = GenerateInvoicePdfJob

import type { WebhookEvent } from '../providers/payment-provider.interface'

export interface ProcessStripeWebhookJob {
  eventId: string
  eventType: WebhookEvent['type']
  rawData: Record<string, unknown>
}
