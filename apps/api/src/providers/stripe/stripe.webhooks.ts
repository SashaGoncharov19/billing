import { db, services, payments, invoices, tenants, products, balanceLogs } from '@entityseven/db'
import { eq } from 'drizzle-orm'
import { PluginManager } from '@api/modules/plugins/plugin.manager'
import type { WebhookEvent } from '../payment-provider.interface'
import { z } from 'zod'

const WebhookDataSchema = z
  .object({
    id: z.string().optional(),
    payment_intent: z.string().optional(),
    customer: z.string().optional(),
    subscription: z.string().optional(),
    status: z
      .enum(['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'])
      .optional(),
    current_period_end: z.number().optional(),
    cancel_at_period_end: z.boolean().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
  })
  .loose()

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
      console.log(`Unhandled webhook event type: ${event.type}`)
  }
}

async function handleCheckoutCompleted(event: WebhookEvent) {
  const eventData = WebhookDataSchema.parse(event.data)
  const customerId = eventData.customer
  const isTopUp = eventData.metadata?.isTopUp === 'true'
  const topUpAmountStr = eventData.metadata?.topUpAmount

  if (!customerId) return

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.stripeCustomerId, customerId),
  })

  if (!tenant) {
    console.log(`[WEBHOOK] Tenant not found for customer ${customerId}`)
    return
  }

  if (isTopUp && topUpAmountStr) {
    const amount = Number(topUpAmountStr)
    const newBalance = Number(tenant.accountBalance) + amount
    
    await db.transaction(async (tx) => {
      await tx.update(tenants).set({ accountBalance: newBalance.toFixed(2) }).where(eq(tenants.id, tenant.id))
      
      await tx.insert(balanceLogs).values({
        tenantId: tenant.id,
        amount: amount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        type: 'top_up',
        referenceId: eventData.id,
        description: `Account top-up via Stripe`,
      })
    })

    console.log(`[WEBHOOK] Processed balance top-up for tenant ${tenant.id}. Added $${amount}`)
    return
  }
}

// Payment Intent Handlers
async function handlePaymentSucceeded(event: WebhookEvent) {
  const eventData = WebhookDataSchema.parse(event.data)
  const providerPaymentId = eventData.payment_intent
  if (!providerPaymentId) return

  await db.transaction(async (tx) => {
    const updatedPayments = await tx
      .update(payments)
      .set({ status: 'succeeded' })
      .where(eq(payments.providerPaymentId, providerPaymentId))
      .returning()

    for (const payment of updatedPayments) {
      if (payment.invoiceId) {
        await tx
          .update(invoices)
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
    await tx
      .update(payments)
      .set({ status: 'failed' })
      .where(eq(payments.providerPaymentId, providerPaymentId))
  })
}
