import { describe, it, expect, beforeEach } from 'bun:test'
import { handleWebhookEvent } from '../../src/providers/stripe/stripe.webhooks'
import { testDb, resetDb } from '../helpers/db'
import { tenants, subscriptions, payments, invoices } from '@entityseven/db'

describe('Stripe Webhooks Handler', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('checkout.completed > provisions missing subscription for given customer', async () => {
    const [t] = await testDb.insert(tenants).values({ name: 'Tenant', slug: 'tenant', stripeCustomerId: 'cus_webhook' }).returning()
    
    await handleWebhookEvent({
      type: 'checkout.completed',
      providerId: 'evt_test',
      data: { customer: 'cus_webhook', subscription: 'sub_webhook' }
    })

    const subs = await testDb.query.subscriptions.findMany()
    expect(subs.length).toBe(1)
    expect(subs[0]!.tenantId).toBe(t!.id)
    expect(subs[0]!.providerSubscriptionId).toBe('sub_webhook')
    expect(subs[0]!.status).toBe('active')
  })

  it('payment.succeeded > marks payment and underlying invoice as paid', async () => {
    const [t] = await testDb.insert(tenants).values({ name: 'Tenant', slug: 'tenant' }).returning()
    const [inv] = await testDb.insert(invoices).values({ tenantId: t!.id, status: 'open', totalAmount: '100', subtotalAmount: '100', currency: 'usd' }).returning()
    await testDb.insert(payments).values({ tenantId: t!.id, invoiceId: inv!.id, providerPaymentId: 'pi_test', amount: '100', currency: 'usd', status: 'pending', provider: 'stripe' })

    await handleWebhookEvent({
      type: 'payment.succeeded',
      providerId: 'evt_test2',
      data: { payment_intent: 'pi_test' }
    })

    const p = await testDb.query.payments.findFirst({ where: (tb, { eq }) => eq(tb.providerPaymentId, 'pi_test') })
    expect(p!.status).toBe('succeeded')

    const updatedInv = await testDb.query.invoices.findFirst({ where: (tb, { eq }) => eq(tb.id, inv!.id) })
    expect(updatedInv!.status).toBe('paid')
    expect(updatedInv!.paidAt).toBeDefined()
  })

  it('subscription.updated > updates subscription period and status', async () => {
    const [t] = await testDb.insert(tenants).values({ name: 'T', slug: 't' }).returning()
    await testDb.insert(subscriptions).values({ tenantId: t!.id, provider: 'stripe', providerSubscriptionId: 'sub_update', status: 'incomplete' })

    const futureEnd = Math.floor(Date.now() / 1000) + 86400
    await handleWebhookEvent({
      type: 'subscription.updated',
      providerId: 'evt_sub',
      data: { id: 'sub_update', status: 'active', current_period_end: futureEnd, cancel_at_period_end: true }
    })

    const sub = await testDb.query.subscriptions.findFirst({ where: (tb, { eq }) => eq(tb.providerSubscriptionId, 'sub_update') })
    expect(sub!.status).toBe('active')
    expect(sub!.cancelAtPeriodEnd).toBe(true)
    expect(sub!.currentPeriodEnd?.getTime()).toBeGreaterThan(Date.now())
  })
})
