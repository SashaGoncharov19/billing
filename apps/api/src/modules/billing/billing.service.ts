import { getPaymentProvider } from '../../providers/provider.factory'
import { db, products, tenants, subscriptions, memberships, users } from '@entityseven/db'
import { eq, and } from 'drizzle-orm'

export class BillingService {
  private provider = getPaymentProvider()

  async getCustomerForTenant(tenantId: string) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId)
    })
    
    if (!tenant) throw new Error('Tenant not found')
    
    if (tenant.stripeCustomerId) {
      return tenant.stripeCustomerId
    }

    const ownerMembership = await db.select({
      email: users.email
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

  async createCheckoutSession(tenantId: string, productId: string, successUrl: string, cancelUrl: string) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId)
    })
    
    if (!product || product.tenantId !== tenantId) {
      throw new Error('Product not found or access denied')
    }
    if (!product.stripePriceId) {
        throw new Error('Product does not have a Stripe Price ID')
    }

    const customerId = await this.getCustomerForTenant(tenantId)

    const session = await this.provider.createCheckoutSession({
      tenantId,
      customerId,
      priceId: product.stripePriceId,
      successUrl,
      cancelUrl,
      mode: product.billingType === 'recurring' ? 'subscription' : 'payment',
      metadata: { tenantId, productId }
    })

    return session
  }

  async createPortalSession(tenantId: string, returnUrl: string) {
    const customerId = await this.getCustomerForTenant(tenantId)
    return this.provider.createPortalSession(customerId, returnUrl)
  }

  async getSubscriptionForTenant(tenantId: string) {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.tenantId, tenantId)
    })
    
    return sub || null
  }
}
