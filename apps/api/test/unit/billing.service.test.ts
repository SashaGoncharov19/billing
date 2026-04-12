import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { checkIdempotency } from '../../src/lib/idempotency'
import { testDb, resetDb } from '../helpers/db'
import { idempotencyKeys, tenants, users, memberships, products } from '@entityseven/db'
import { BillingService } from '../../src/modules/billing/billing.service'

const mockProvider = {
  createCustomer: mock().mockResolvedValue('cus_123'),
  createCheckoutSession: mock().mockResolvedValue({ sessionId: 'cs_123', url: 'https://checkout' }),
  createPortalSession: mock().mockResolvedValue('https://portal'),
}

mock.module('../../src/providers/provider.factory', () => ({
  getPaymentProvider: () => mockProvider
}))

describe('Billing - Webhooks Idempotency', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('inserts a new idempotency key if it does not exist', async () => {
    const isNew = await checkIdempotency('evt_123')
    expect(isNew).toBe(true)
    const keys = await testDb.select().from(idempotencyKeys)
    expect(keys.length).toBe(1)
    expect(keys[0]!.key).toBe('evt_123')
  })

  it('returns false for duplicate webhook event key', async () => {
    await checkIdempotency('evt_123')
    const isNewSecond = await checkIdempotency('evt_123')
    expect(isNewSecond).toBe(false)
  })
})

describe('BillingService', () => {
  let service: BillingService

  beforeEach(async () => {
    await resetDb()
    mockProvider.createCustomer.mockClear()
    mockProvider.createCheckoutSession.mockClear()
    mockProvider.createPortalSession.mockClear()
    
    // We instantiate after mock is applied
    service = new BillingService()
  })

  it('getCustomerForTenant > returns existing stripeCustomerId if present', async () => {
    const [t] = await testDb.insert(tenants).values({ name: 'T1', slug: 't1', stripeCustomerId: 'cus_existing' }).returning()
    const customerId = await service.getCustomerForTenant(t!.id)
    expect(customerId).toBe('cus_existing')
    expect(mockProvider.createCustomer).not.toHaveBeenCalled()
  })

  it('getCustomerForTenant > provisions a new customer using owner email and saves it', async () => {
    const [u] = await testDb.insert(users).values({ email: 'owner@test.com', passwordHash: 'hash' }).returning()
    const [t] = await testDb.insert(tenants).values({ name: 'T2', slug: 't2' }).returning()
    await testDb.insert(memberships).values({ tenantId: t!.id, userId: u!.id, role: 'owner' })
    
    const customerId = await service.getCustomerForTenant(t!.id)
    
    expect(customerId).toBe('cus_123')
    expect(mockProvider.createCustomer).toHaveBeenCalledWith({
      tenantId: t!.id,
      email: 'owner@test.com',
      name: 'T2'
    })

    const updated = await testDb.query.tenants.findFirst({ where: (ts, { eq }) => eq(ts.id, t!.id) })
    expect(updated!.stripeCustomerId).toBe('cus_123')
  })

  it('createCheckoutSession > calls provider with mapped data', async () => {
    const [u] = await testDb.insert(users).values({ email: 'owner@test.com', passwordHash: 'hash' }).returning()
    const [t] = await testDb.insert(tenants).values({ name: 'T2', slug: 't2' }).returning()
    await testDb.insert(memberships).values({ tenantId: t!.id, userId: u!.id, role: 'owner' })
    const [p] = await testDb.insert(products).values({ tenantId: t!.id, name: 'SaaS', billingType: 'recurring', price: '10', stripePriceId: 'price_abc', currency: 'usd' }).returning()
    
    const session = await service.createCheckoutSession(t!.id, p!.id, 'http://success', 'http://cancel')
    expect(session.url).toBe('https://checkout')
    expect(mockProvider.createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: t!.id,
      customerId: 'cus_123',
      priceId: 'price_abc',
      mode: 'subscription'
    }))
  })

  it('createPortalSession > calls provider correctly', async () => {
    const [t] = await testDb.insert(tenants).values({ name: 'T1', slug: 't1', stripeCustomerId: 'cus_exist' }).returning()
    const url = await service.createPortalSession(t!.id, 'http://return')
    expect(url).toBe('https://portal')
    expect(mockProvider.createPortalSession).toHaveBeenCalledWith('cus_exist', 'http://return')
  })
})
