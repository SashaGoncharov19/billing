import { describe, it, expect, mock, beforeEach } from 'bun:test'

const stripeMock = {
  customers: {
    create: mock().mockResolvedValue({ id: 'cus_new' }),
    update: mock().mockResolvedValue({}),
  },
  checkout: {
    sessions: {
      create: mock().mockResolvedValue({ id: 'cs_test', url: 'http://checkout-url' })
    }
  },
  subscriptions: {
    create: mock().mockResolvedValue({ id: 'sub_new', status: 'active', current_period_end: 1234567890 }),
    update: mock().mockResolvedValue({}),
    cancel: mock().mockResolvedValue({}),
    retrieve: mock().mockResolvedValue({
      id: 'sub_exist',
      status: 'past_due',
      current_period_end: 1234567890,
      cancel_at_period_end: false,
      items: { data: [{ id: 'si_item' }] }
    })
  },
  billingPortal: {
    sessions: {
      create: mock().mockResolvedValue({ url: 'http://portal-url' })
    }
  },
  webhooks: {
    constructEvent: mock().mockReturnValue({
      type: 'checkout.session.completed',
      id: 'evt_real',
      data: { object: { customer: 'cus_wh' } }
    })
  }
}

mock.module('stripe', () => {
  return {
    default: function Stripe() {
      return stripeMock
    }
  }
})

import { StripeProvider } from '../../src/providers/stripe/stripe.provider'

describe('StripeProvider Wrapper', () => {
  let provider: StripeProvider

  beforeEach(() => {
    provider = new StripeProvider('sk_test')
  })

  it('createCustomer interacts with SDK', async () => {
    const id = await provider.createCustomer({ tenantId: 't1', email: 'e@x.com', name: 'N' })
    expect(id).toBe('cus_new')
    expect(stripeMock.customers.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'e@x.com' }))
  })

  it('createCheckoutSession formats correct SDK payload', async () => {
    const session = await provider.createCheckoutSession({
      tenantId: 't1', customerId: 'c1', priceId: 'p1', successUrl: 'http://s', cancelUrl: 'http://c', mode: 'subscription'
    })
    expect(session.url).toBe('http://checkout-url')
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({ mode: 'subscription' }))
  })

  it('subscriptions interactions work correctly', async () => {
    const sub = await provider.createSubscription({ tenantId: 't1', customerId: 'c1', priceId: 'p1', trialDays: 7 })
    expect(sub.subscriptionId).toBe('sub_new')
    expect(sub.status).toBe('active')
    
    await provider.updateSubscription('sub_exist', 'price_new')
    expect(stripeMock.subscriptions.update).toHaveBeenCalled()
    expect(stripeMock.subscriptions.retrieve).toHaveBeenCalled()
    
    await provider.cancelSubscription('sub_exist', false)
    expect(stripeMock.subscriptions.cancel).toHaveBeenCalled()
  })

  it('handleWebhook parses and formats into domain WebhookEvent', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec'
    const evt = provider.handleWebhook({ rawBody: 'body', signature: 'sig' })
    expect(stripeMock.webhooks.constructEvent).toHaveBeenCalledWith('body', 'sig', 'whsec')
    expect(evt.type).toBe('checkout.completed')
    expect(evt.data.customer).toBe('cus_wh')
  })
})
