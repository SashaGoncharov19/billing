export interface CreateCustomerData {
  tenantId: string
  email: string
  name: string
  metadata?: Record<string, string>
}

export interface CreateCheckoutSessionData {
  tenantId: string
  customerId: string
  priceId?: string // Stripe Price ID or internal product ID
  lineItems?: {
    priceId?: string
    priceData?: { currency: string; product_data: { name: string }; unit_amount: number }
    quantity: number
  }[]
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
  mode: 'payment' | 'subscription'
  quantity?: number
}

export interface CreateSubscriptionData {
  tenantId: string
  customerId: string
  priceId: string
  trialDays?: number
  metadata?: Record<string, string>
}

export interface SubscriptionData {
  id: string
  status: string
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}

export interface WebhookPayload {
  rawBody: string | Buffer
  signature: string
}

export interface WebhookEvent {
  type:
    | 'checkout.completed'
    | 'payment.succeeded'
    | 'payment.failed'
    | 'subscription.created'
    | 'subscription.updated'
    | 'subscription.canceled'
    | 'invoice.paid'
    | 'invoice.payment_failed'
    | 'unknown'
  data: Record<string, unknown>
  providerId: string // Provider event ID
}

export interface PaymentProvider {
  // Customer management
  createCustomer(data: CreateCustomerData): Promise<string> // returns providerId
  updateCustomer(customerId: string, data: Partial<CreateCustomerData>): Promise<void>

  // Checkout
  createCheckoutSession(data: CreateCheckoutSessionData): Promise<{
    sessionId: string
    url: string
  }>

  // Subscriptions
  createSubscription(data: CreateSubscriptionData): Promise<{
    subscriptionId: string
    status: string
    currentPeriodEnd: Date
  }>
  cancelSubscription(subscriptionId: string, atPeriodEnd?: boolean): Promise<void>
  updateSubscription(subscriptionId: string, priceId: string): Promise<void>
  getSubscription(subscriptionId: string): Promise<SubscriptionData>

  // Webhooks
  handleWebhook(payload: WebhookPayload): WebhookEvent
  verifyWebhook(payload: WebhookPayload): boolean

  // Payment methods
  createPortalSession(customerId: string, returnUrl: string): Promise<string>
}
