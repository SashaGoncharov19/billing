import Stripe from 'stripe'
import type {
  PaymentProvider,
  CreateCustomerData,
  CreateCheckoutSessionData,
  CreateSubscriptionData,
  SubscriptionData,
  WebhookPayload,
  WebhookEvent
} from '../payment-provider.interface'

import { z } from 'zod'

const StripeSubscriptionObjectSchema = z.object({
  id: z.string(),
  status: z.string(),
  current_period_end: z.number(),
  cancel_at_period_end: z.boolean().default(false),
}).loose()

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
    })
  }

  async createCustomer(data: CreateCustomerData): Promise<string> {
    const customer = await this.stripe.customers.create({
      email: data.email,
      name: data.name,
      metadata: {
        tenantId: data.tenantId,
        ...data.metadata,
      },
    })
    return customer.id
  }

  async updateCustomer(customerId: string, data: Partial<CreateCustomerData>): Promise<void> {
    const updateParams: Stripe.CustomerUpdateParams = {}
    if (data.email !== undefined) updateParams.email = data.email
    if (data.name !== undefined) updateParams.name = data.name
    if (data.metadata !== undefined) updateParams.metadata = data.metadata

    await this.stripe.customers.update(customerId, updateParams)
  }

  async createCheckoutSession(data: CreateCheckoutSessionData) {
    const session = await this.stripe.checkout.sessions.create({
      customer: data.customerId,
      mode: data.mode,
      line_items: [{
        price: data.priceId,
        quantity: data.quantity ?? 1,
      }],
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      metadata: {
        tenantId: data.tenantId,
        ...data.metadata,
      },
    })
    return { sessionId: session.id, url: session.url! }
  }

  async createSubscription(data: CreateSubscriptionData) {
    const params: Stripe.SubscriptionCreateParams = {
      customer: data.customerId,
      items: [{ price: data.priceId }],
      metadata: {
        tenantId: data.tenantId,
        ...data.metadata,
      },
    }
    if (data.trialDays !== undefined) {
      params.trial_period_days = data.trialDays
    }
    const rawSubscription = await this.stripe.subscriptions.create(params)
    const subscription = StripeSubscriptionObjectSchema.parse(rawSubscription)
    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    }
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd = false): Promise<void> {
    if (atPeriodEnd) {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })
    } else {
      await this.stripe.subscriptions.cancel(subscriptionId)
    }
  }

  async updateSubscription(subscriptionId: string, priceId: string): Promise<void> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
    if (!subscription.items.data[0]) throw new Error('No subscription items found')
    const itemId = subscription.items.data[0].id
    await this.stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: itemId,
        price: priceId,
      }],
    })
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionData> {
    const rawSubscription = await this.stripe.subscriptions.retrieve(subscriptionId)
    const subscription = StripeSubscriptionObjectSchema.parse(rawSubscription)
    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    }
  }

  verifyWebhook(payload: WebhookPayload): boolean {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn('STRIPE_WEBHOOK_SECRET is not set. Webhook verification skipping/failing.');
      return false;
    }
    try {
      this.stripe.webhooks.constructEvent(
        payload.rawBody,
        payload.signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
      return true
    } catch {
      return false
    }
  }

  handleWebhook(payload: WebhookPayload): WebhookEvent {
    const event = this.stripe.webhooks.constructEvent(
      payload.rawBody,
      payload.signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    return this.mapStripeEvent(event)
  }

  private mapStripeEvent(event: Stripe.Event): WebhookEvent {
    const typeMapping: Record<string, WebhookEvent['type']> = {
      'checkout.session.completed': 'checkout.completed',
      'payment_intent.succeeded': 'payment.succeeded',
      'payment_intent.payment_failed': 'payment.failed',
      'customer.subscription.created': 'subscription.created',
      'customer.subscription.updated': 'subscription.updated',
      'customer.subscription.deleted': 'subscription.canceled',
      'invoice.paid': 'invoice.paid',
      'invoice.payment_failed': 'invoice.payment_failed',
    }

    return {
      type: typeMapping[event.type] ?? 'unknown',
      data: event.data.object as unknown as Record<string, unknown>,
      providerId: event.id,
    }
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
    return session.url
  }
}
