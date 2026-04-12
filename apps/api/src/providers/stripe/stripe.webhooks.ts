import { db, subscriptions, payments, invoices, tenants } from '@entityseven/db'
import { eq } from 'drizzle-orm'
import type { WebhookEvent } from '../payment-provider.interface'
import { z } from 'zod'

const WebhookDataSchema = z.object({
  id: z.string().optional(),
  payment_intent: z.string().optional(),
  customer: z.string().optional(),
  subscription: z.string().optional(),
  status: z.enum(['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete']).optional(),
  current_period_end: z.number().optional(),
  cancel_at_period_end: z.boolean().optional(),
}).loose()

export async function handleWebhookEvent(event: WebhookEvent) {
  switch (event.type) {
    case 'checkout.completed':
      await handleCheckoutCompleted(event)
      break
    case 'payment.succeeded':
      await handlePaymentSucceeded(event)
      break
    case 'payment.failed':
      await handlePaymentFailed(event)
      break
    case 'subscription.updated':
    case 'subscription.created':
    case 'subscription.canceled':
      await handleSubscriptionUpdated(event)
      break
    case 'invoice.paid':
      await handleInvoicePaid(event)
      break
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event)
      break
    default:
      console.log(`Unhandled webhook event type: ${event.type}`)
  }
}

async function handleCheckoutCompleted(event: WebhookEvent) {
  const eventData = WebhookDataSchema.parse(event.data)
  const customerId = eventData.customer
  const subscriptionId = eventData.subscription

  if (!customerId || !subscriptionId) return

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.stripeCustomerId, customerId)
  })

  if (!tenant) {
    console.log(`[WEBHOOK] Tenant not found for customer ${customerId}`)
    return
  }

  const existingSub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.providerSubscriptionId, subscriptionId)
  })

  if (!existingSub) {
    await db.insert(subscriptions).values({
      tenantId: tenant.id,
      provider: 'stripe',
      providerSubscriptionId: subscriptionId,
      status: 'active',
    })
  }

  console.log(`[WEBHOOK] Processed checkout.completed for tenant ${tenant.id}`)
}

async function handlePaymentSucceeded(event: WebhookEvent) {
  const eventData = WebhookDataSchema.parse(event.data)
  const providerPaymentId = eventData.payment_intent
  if (!providerPaymentId) return

  await db.transaction(async (tx) => {
    const updatedPayments = await tx.update(payments)
      .set({ status: 'succeeded' })
      .where(eq(payments.providerPaymentId, providerPaymentId))
      .returning()

    for (const payment of updatedPayments) {
      if (payment.invoiceId) {
        await tx.update(invoices)
          .set({ status: 'paid', paidAt: new Date() })
          .where(eq(invoices.id, payment.invoiceId))
      }
    }
  })
}

async function handlePaymentFailed(event: WebhookEvent) {
  const eventData = WebhookDataSchema.parse(event.data)
  const providerPaymentId = eventData.payment_intent
  if (!providerPaymentId) return

  await db.transaction(async (tx) => {
    await tx.update(payments)
      .set({ status: 'failed' })
      .where(eq(payments.providerPaymentId, providerPaymentId))
  })
}

async function handleSubscriptionUpdated(event: WebhookEvent) {
  const eventData = WebhookDataSchema.parse(event.data)
  const providerSubscriptionId = eventData.id
  const status = eventData.status
  const currentPeriodEndNum = eventData.current_period_end

  if (!providerSubscriptionId || !status || !currentPeriodEndNum) return

  await db.transaction(async (tx) => {
    await tx.update(subscriptions)
      .set({
        status: status,
        currentPeriodEnd: new Date(currentPeriodEndNum * 1000),
        cancelAtPeriodEnd: eventData.cancel_at_period_end ?? false,
      })
      .where(eq(subscriptions.providerSubscriptionId, providerSubscriptionId))
  })
}

async function handleInvoicePaid(event: WebhookEvent) {
  const eventData = WebhookDataSchema.parse(event.data)
  const subscriptionId = eventData.subscription
  if (!subscriptionId) return
  
  await db.transaction(async (tx) => {
    await tx.update(subscriptions)
      .set({ status: 'active' })
      .where(eq(subscriptions.providerSubscriptionId, subscriptionId))
  })
}

async function handleInvoicePaymentFailed(event: WebhookEvent) {
  const eventData = WebhookDataSchema.parse(event.data)
  const subscriptionId = eventData.subscription
  if (!subscriptionId) return

  await db.transaction(async (tx) => {
    await tx.update(subscriptions)
      .set({ status: 'past_due' })
      .where(eq(subscriptions.providerSubscriptionId, subscriptionId))
  })
}
