import { db, products } from '@entityseven/db'
import { eq, and, isNull } from 'drizzle-orm'
import Stripe from 'stripe'

export class ProductsService {
  private stripe: Stripe | null = null

  constructor() {
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2026-03-25.dahlia',
      })
    }
  }

  async listProducts(tenantId: string) {
    return db.query.products.findMany({
      where: and(eq(products.tenantId, tenantId), isNull(products.deletedAt)),
    })
  }

  async createProduct(
    tenantId: string,
    data: {
      name: string
      description?: string
      price: string
      setupFee?: string
      currency?: string
      billingType: 'one_time' | 'recurring'
      billingInterval?: 'month' | 'year'
      pluginType?: string
      pluginConfig?: unknown
    },
  ) {
    // Basic product creation logic. If recurring we might sync to Stripe here.
    // In many SaaS, products are global but here SPEC says tenant-scoped.
    let stripeProductId = null
    let stripePriceId = null

    if (this.stripe) {
      const productParams: Stripe.ProductCreateParams = {
        name: data.name,
        metadata: { tenantId },
      }
      if (data.description !== undefined) {
        productParams.description = data.description
      }

      const sp = await this.stripe.products.create(productParams)
      stripeProductId = sp.id

      const priceParams: Stripe.PriceCreateParams = {
        product: sp.id,
        unit_amount: Math.round(parseFloat(data.price) * 100),
        currency: data.currency || 'usd',
      }

      if (data.billingType === 'recurring') {
        priceParams.recurring = { interval: data.billingInterval || 'month' }
      }

      const price = await this.stripe.prices.create(priceParams)
      stripePriceId = price.id
    }

    const [newProduct] = await db
      .insert(products)
      .values({
        tenantId,
        name: data.name,
        description: data.description,
        price: data.price,
        setupFee: data.setupFee || '0',
        currency: data.currency || 'USD',
        billingType: data.billingType,
        billingInterval: data.billingInterval,
        pluginType: data.pluginType,
        pluginConfig: data.pluginConfig,
        stripeProductId,
        stripePriceId,
      })
      .returning()

    return newProduct
  }

  async updateProduct(
    tenantId: string,
    id: string,
    data: Partial<{
      name: string
      description: string
      price: string
      setupFee: string
      currency: string
      pluginType: string
      pluginConfig: unknown
      isActive: boolean
    }>,
  ) {
    const payload: any = { ...data, updatedAt: new Date() }

    const [updated] = await db
      .update(products)
      .set(payload)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
      .returning()
    return updated
  }

  async deleteProduct(tenantId: string, productId: string) {
    const [deleted] = await db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
      .returning()
    return deleted
  }
}
