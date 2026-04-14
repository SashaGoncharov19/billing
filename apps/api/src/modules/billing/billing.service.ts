import { getPaymentProvider } from '@api/providers/provider.factory'
import type { CreateCheckoutSessionData } from '@api/providers/payment-provider.interface'
import { db, tenants, memberships, users } from '@entityseven/db'
import { eq, and } from 'drizzle-orm'

export class BillingService {
  private provider = getPaymentProvider()

  async getCustomerForTenant(tenantId: string) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    })

    if (!tenant) throw new Error('Tenant not found')

    if (tenant.stripeCustomerId) {
      return tenant.stripeCustomerId
    }

    const ownerMembership = await db
      .select({
        email: users.email,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.role, 'owner')))
      .limit(1)

    const ownerEmail = ownerMembership[0]?.email

    if (!ownerEmail) {
      throw new Error('Tenant has no owner email to register payment customer')
    }

    const customerId = await this.provider.createCustomer({
      tenantId,
      email: ownerEmail,
      name: tenant.name,
    })

    await db.update(tenants).set({ stripeCustomerId: customerId }).where(eq(tenants.id, tenantId))
    return customerId
  }

  async createCheckoutSession(
    tenantId: string,
    items: { productId: string; quantity: number }[],
    successUrl: string,
    cancelUrl: string,
    ipCountry?: string | null,
  ) {
    if (!items || items.length === 0) {
      throw new Error('No items provided')
    }

    // Validate products exist
    const dbProducts = await db.query.products.findMany({
      where: (p, { inArray }) =>
        inArray(
          p.id,
          items.map((i) => i.productId),
        ),
    })

    if (dbProducts.length !== items.length) {
      throw new Error('One or more products not found')
    }

    // Ensure all products belong to tenant
    if (dbProducts.some((p) => p.tenantId !== tenantId)) {
      throw new Error('Access denied to one or more products')
    }

    // Ensure all products have Stripe Price ID
    if (dbProducts.some((p) => !p.stripePriceId)) {
      throw new Error('One or more products missing Stripe integration')
    }

    if (ipCountry) {
      const tenantRec = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
      const checkCountry = tenantRec?.billingCountry

      if (checkCountry && ipCountry.toUpperCase() !== checkCountry.toUpperCase()) {
        return {
          error: 'COUNTRY_MISMATCH',
          message: `Your IP country (${ipCountry}) does not match your billing country (${checkCountry}). Stripe checkout restricted.`,
        }
      }
    }
    const customerId = await this.getCustomerForTenant(tenantId)

    const lineItems: NonNullable<CreateCheckoutSessionData['lineItems']> = []
    items.forEach((item) => {
      const product = dbProducts.find((p) => p.id === item.productId)!
      lineItems.push({ priceId: product.stripePriceId!, quantity: item.quantity })
      if (product.setupFee && Number(product.setupFee) > 0) {
        lineItems.push({
          priceData: {
            currency: product.currency?.toLowerCase() || 'usd',
            product_data: { name: `${product.name} (Setup Fee)` },
            unit_amount: Math.round(Number(product.setupFee) * 100),
          },
          quantity: item.quantity,
        })
      }
    })

    const session = await this.provider.createCheckoutSession({
      tenantId,
      customerId,
      lineItems,
      successUrl,
      cancelUrl,
      mode: dbProducts.some((p) => p.billingType === 'recurring') ? 'subscription' : 'payment',
      metadata: { tenantId, multiItemCheckout: 'true' },
    })

    return session
  }

  async createPortalSession(tenantId: string, returnUrl: string) {
    const customerId = await this.getCustomerForTenant(tenantId)
    return this.provider.createPortalSession(customerId, returnUrl)
  }

  async createTopUpSession(
    tenantId: string,
    amount: number,
    successUrl: string,
    cancelUrl: string
  ) {
    if (amount <= 0) throw new Error('Amount must be positive')
    
    const customerId = await this.getCustomerForTenant(tenantId)
    
    const session = await this.provider.createCheckoutSession({
      tenantId,
      customerId,
      lineItems: [
        {
          priceData: {
            currency: 'usd',
            product_data: { name: 'Account Balance Top-up' },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        }
      ],
      successUrl,
      cancelUrl,
      mode: 'payment',
      metadata: { tenantId, isTopUp: 'true', topUpAmount: amount.toString() },
    })

    return session
  }
}
