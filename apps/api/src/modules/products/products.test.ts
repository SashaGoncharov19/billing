import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { ProductsService } from './products.service'

const mockUpdateReturning = mock().mockResolvedValue([{ id: 'mock-id' }])
const mockUpdateWhere = mock().mockReturnValue({ returning: mockUpdateReturning })
const mockUpdateSet = mock().mockReturnValue({ where: mockUpdateWhere })
const mockUpdate = mock().mockReturnValue({ set: mockUpdateSet })

const mockInsertValues = mock().mockReturnValue({ returning: mock().mockResolvedValue([{ id: 'prod_123_new' }]) })
const mockInsert = mock().mockReturnValue({ values: mockInsertValues })

const mockFindMany = mock().mockResolvedValue([{ id: 'prod_123', name: 'Existing Product' }])

mock.module('@entityseven/db', () => ({
  db: {
    query: {
      products: {
        findMany: mockFindMany,
      }
    },
    insert: mockInsert,
    update: mockUpdate,
  },
  products: {},
}))

mock.module('drizzle-orm', () => ({
  eq: mock().mockReturnValue({}),
  and: mock().mockReturnValue({}),
  isNull: mock().mockReturnValue({}),
}))

const mockStripeProductsCreate = mock().mockResolvedValue({ id: 'stripe_prod_123', name: 'stripe_product' })
const mockStripePricesCreate = mock().mockResolvedValue({ id: 'stripe_price_123', unit_amount: 1000 })

mock.module('stripe', () => {
  return {
    default: class StripeMock {
      products = { create: mockStripeProductsCreate }
      prices = { create: mockStripePricesCreate }
    }
  }
})

describe('ProductsService', () => {
  let productsService: ProductsService

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
    productsService = new ProductsService()
    mockStripeProductsCreate.mockClear()
    mockStripePricesCreate.mockClear()
    mockInsertValues.mockClear()
    mockUpdateReturning.mockClear()
  })

  it('lists active products for a tenant', async () => {
    const products = await productsService.listProducts('tenant_1')
    expect(products.length).toBe(1)
    expect(products[0]?.id).toBe('prod_123')
  })

  it('creates one_time product without stripe integration', async () => {
    const result = await productsService.createProduct('tenant_1', {
      name: 'Test One Time',
      price: '10.00',
      billingType: 'one_time',
    })

    expect(result?.id).toBe('prod_123_new')
    expect(mockStripeProductsCreate).not.toHaveBeenCalled()
    expect(mockStripePricesCreate).not.toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalled()
  })

  it('creates recurring product by syncing with Stripe', async () => {
    const result = await productsService.createProduct('tenant_1', {
      name: 'Test Subscription',
      description: 'Cool tier',
      price: '25.00',
      billingType: 'recurring',
    })

    expect(result?.id).toBe('prod_123_new')
    expect(mockStripeProductsCreate).toHaveBeenCalledWith({
      name: 'Test Subscription',
      description: 'Cool tier',
      metadata: { tenantId: 'tenant_1' }
    })
    expect(mockStripePricesCreate).toHaveBeenCalledWith({
      product: 'stripe_prod_123',
      unit_amount: 2500,
      currency: 'usd',
      recurring: { interval: 'month' }
    })
    expect(mockInsert).toHaveBeenCalled()
  })

  it('updates product locally', async () => {
    await productsService.updateProduct('tenant_1', 'prod_123_new', { name: 'Updated name' })
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('soft deletes product', async () => {
    await productsService.deleteProduct('tenant_1', 'prod_123_new')
    expect(mockUpdate).toHaveBeenCalled()
  })
})
