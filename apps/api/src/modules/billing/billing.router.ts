import { Elysia } from 'elysia'
import { BillingService } from './billing.service'
import { CheckoutDto, PortalDto } from './billing.schema'
import { authenticate } from '../../middleware/authenticate'
import { resolveTenant } from '../../middleware/tenant'
import { getPaymentProvider } from '../../providers/provider.factory'
import { webhookQueue } from '../../queue/index'

export const billingRouter = new Elysia({ prefix: '/billing' })
  .use(authenticate)
  .use(resolveTenant)
  .decorate('billingService', new BillingService())
  .post('/checkout', async ({ body, tenant, billingService }) => {
    return billingService.createCheckoutSession(
      tenant.id,
      body.productId,
      body.successUrl,
      body.cancelUrl
    )
  }, { body: CheckoutDto })
  .post('/portal', async ({ body, tenant, billingService }) => {
    const url = await billingService.createPortalSession(tenant.id, body.returnUrl)
    return { portalUrl: url }
  }, { body: PortalDto })
  .get('/subscription', async ({ tenant, billingService }) => {
    return billingService.getSubscriptionForTenant(tenant.id)
  })

export const webhookRouter = new Elysia({ prefix: '/api/v1/webhooks' })
  .post('/stripe', async ({ request, set }) => {
    const signature = request.headers.get('stripe-signature')
    
    if (!signature) {
      set.status = 400
      return { error: 'Missing stripe-signature header' }
    }

    const provider = getPaymentProvider()
    const rawBody = await request.text()

    if (!provider.verifyWebhook({ rawBody, signature })) {
      set.status = 400
      return { error: 'Invalid webhook signature' }
    }

    const event = provider.handleWebhook({ rawBody, signature })
    
    // Add to BullMQ
    await webhookQueue.add('process-webhook', event, {
      jobId: event.providerId, // Idempotent queuing
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 }
    })

    return { received: true }
  })
