import { Elysia } from 'elysia'
import { BillingService } from './billing.service'
import { CheckoutDto, PortalDto } from './billing.schema'
import { t } from 'elysia'
import { db, products, invoices, invoiceItems, currencies, paymentMethods, users, taxRates } from '@entityseven/db'
import { eq, and } from 'drizzle-orm'
import { authenticate } from '../../middleware/authenticate'
import { resolveTenant } from '../../middleware/tenant'
import { getPaymentProvider } from '../../providers/provider.factory'
import { webhookQueue, pdfQueue } from '../../queue/index'

export const billingRouter = new Elysia({ prefix: '/billing' })
  .use(authenticate)
  .use(resolveTenant)
  .decorate('billingService', new BillingService())
  .post('/checkout', async ({ request, body, tenant, billingService }) => {
    const ipCountry = request.headers.get('CF-IPCountry') || request.headers.get('cf-ipcountry')
    return billingService.createCheckoutSession(
      tenant.id,
      body.items,
      body.successUrl,
      body.cancelUrl,
      ipCountry
    )
  }, { body: CheckoutDto })
  .post('/portal', async ({ body, tenant, billingService }) => {
    const url = await billingService.createPortalSession(tenant.id, body.returnUrl)
    return { portalUrl: url }
  }, { body: PortalDto })
  .get('/subscription', async ({ tenant, billingService }) => {
    return billingService.getSubscriptionForTenant(tenant.id)
  })
  .post('/manual-checkout', async ({ request, body, tenant, user }) => {
    const dbUser = await db.query.users.findFirst({
       where: eq(users.id, user.id)
    })
    if (!dbUser) throw new Error("User not found")
    
    // Process currency
    let currencyStr = 'usd'
    let rate = 1.0
    if (body.currencyId) {
      const curr = await db.query.currencies.findFirst({ where: eq(currencies.id, body.currencyId) })
      if (curr) {
        currencyStr = curr.code
        rate = Number(curr.exchangeRate)
      }
    }

    const pm = await db.query.paymentMethods.findFirst({ where: eq(paymentMethods.id, body.paymentMethodId) })
    
    const ipCountry = request.headers.get('CF-IPCountry') || request.headers.get('cf-ipcountry')
    const userCountry = dbUser.billingCountry || tenant.billingCountry
    
    // Suggest price for IP country / detect mismatch
    if (ipCountry && userCountry && ipCountry.toUpperCase() !== userCountry.toUpperCase()) {
      return { 
        error: 'COUNTRY_MISMATCH', 
        message: `Your IP country (${ipCountry}) does not match your billing country (${userCountry}). Please update your billing details.` 
      }
    }

    // Dynamic Tax from tax_rates table based on IP Country
    let appliedTaxRate = 0
    if (ipCountry) {
       const tr = await db.query.taxRates.findFirst({
          where: and(eq(taxRates.tenantId, tenant.id), eq(taxRates.countryCode, ipCountry.toUpperCase()))
       })
       if (tr) appliedTaxRate = Number(tr.taxRate)
    }

    // Accumulate total
    let totalBaseAmount = 0
    const invoiceItemsData: any[] = []

    for (const item of body.items) {
      const product = await db.query.products.findFirst({
         where: eq(products.id, item.productId)
      })
      if (!product) throw new Error(`Product ${item.productId} not found`)
      
      const itemPriceConverted = Number(product.price) * rate
      const itemTotal = itemPriceConverted * item.quantity
      totalBaseAmount += itemTotal

      invoiceItemsData.push({
        productId: product.id,
        description: product.name,
        unitPrice: itemPriceConverted.toFixed(2),
        totalAmount: itemTotal.toFixed(2),
        quantity: item.quantity,
      })
    }

    const taxAmount = totalBaseAmount * appliedTaxRate
    const finalAmount = totalBaseAmount + taxAmount

    const [newInvoice] = await db.insert(invoices).values({
      tenantId: tenant.id,
      number: Number(Date.now().toString().slice(-8)),
      status: 'open',
      currency: currencyStr.toUpperCase(),
      totalAmount: finalAmount.toFixed(2),
      subtotalAmount: totalBaseAmount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      issuedAt: new Date(),
      paymentMethod: pm ? pm.name : null,
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
      for (const itemData of invoiceItemsData) {
        await db.insert(invoiceItems).values({
          invoiceId: newInvoice.id,
          ...itemData
        })
      }

      await pdfQueue.add('generate-invoice', { 
        type: 'invoice', 
        data: { invoiceId: newInvoice.id, tenantId: tenant.id } 
      })

      return { invoiceId: newInvoice.id }
    }
    throw new Error('Failed to create invoice')
  }, {
    body: t.Object({
      items: t.Array(t.Object({
        productId: t.String(),
        quantity: t.Numeric()
      })),
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
