import { Elysia } from 'elysia'
import { BillingService } from './billing.service'
import { CheckoutDto, PortalDto } from './billing.schema'
import { t } from 'elysia'
import { db, products, invoices, invoiceItems, currencies, paymentMethods, users } from '@entityseven/db'
import { eq } from 'drizzle-orm'
import { authenticate } from '../../middleware/authenticate'
import { resolveTenant } from '../../middleware/tenant'
import { getPaymentProvider } from '../../providers/provider.factory'
import { webhookQueue, pdfQueue } from '../../queue/index'

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
  .post('/manual-checkout', async ({ body, tenant, user }) => {
    const product = await db.query.products.findFirst({
       where: eq(products.id, body.productId)
    })
    if (!product) throw new Error("Product not found")

    const dbUser = await db.query.users.findFirst({
       where: eq(users.id, user.id)
    })
    if (!dbUser) throw new Error("User not found")
    
    let totalAmount = Number(product.price)
    let currencyStr = 'usd'
    let rate = '1.0'

    if (body.currencyId) {
      const curr = await db.query.currencies.findFirst({ where: eq(currencies.id, body.currencyId) })
      if (curr) {
        currencyStr = curr.code
        rate = curr.exchangeRate
        totalAmount = totalAmount * Number(rate)
      }
    }

    const [newInvoice] = await db.insert(invoices).values({
      tenantId: tenant.id,
      number: Number(Date.now().toString().slice(-8)),
      status: 'open',
      currency: currencyStr.toUpperCase(),
      totalAmount: (totalAmount * (1 + Number(product.taxRate || 0))).toFixed(2),
      subtotalAmount: totalAmount.toFixed(2),
      taxAmount: (totalAmount * Number(product.taxRate || 0)).toFixed(2),
      issuedAt: new Date(),
      createdByUserId: user.id,
      issuerDetails: {
        name: tenant.billingEntity || tenant.name,
        address: tenant.billingAddress,
        taxId: tenant.billingTaxId,
        email: tenant.billingEmail,
        country: tenant.billingCountry
      },
      recipientDetails: {
        name: dbUser.billingName || dbUser.email,
        address: dbUser.billingAddress,
        taxId: dbUser.billingTaxId,
        email: dbUser.billingEmail || dbUser.email,
        country: dbUser.billingCountry
      }
    }).returning()

    if (newInvoice) {
      await db.insert(invoiceItems).values({
        invoiceId: newInvoice.id,
        productId: product.id,
        description: product.name,
        unitPrice: totalAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        quantity: 1,
      })

      await pdfQueue.add('generate-invoice', { 
        type: 'invoice', 
        data: { invoiceId: newInvoice.id, tenantId: tenant.id } 
      })

      return { invoiceId: newInvoice.id }
    }
    throw new Error('Failed to create invoice')
  }, {
    body: t.Object({
      productId: t.String(),
      paymentMethodId: t.String(),
      currencyId: t.Optional(t.String())
    })
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
