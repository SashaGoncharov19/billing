import { describe, it, expect, beforeEach } from 'bun:test'
import { app } from '../../src'
import { resetDb, testDb } from '../helpers/db'

describe('Invoice API Integration', () => {
  let mainUser: { id: string, accessToken: string }
  let tenantId: string

  beforeEach(async () => {
    await resetDb()

    // Setup an authenticated user and a tenant
    const regRes = await app.handle(new Request('http://localhost/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@host.com', password: 'password', name: 'Owner', tenantName: 'Tenant' })
    }))

    const body = await regRes.json() as any
    mainUser = { id: body.user.id, accessToken: body.accessToken }

    const t = await testDb.query.tenants.findFirst()
    tenantId = t!.id
  })

  it('POST /api/v1/invoices — creates a draft invoice', async () => {
    const req = new Request(`http://localhost/api/v1/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mainUser.accessToken}`,
        'x-tenant-id': `${tenantId}`
      },
      body: JSON.stringify({
        items: [{ description: 'Test', quantity: 2, unitPrice: '10', taxRate: '0' }]
      })
    })

    const res = await app.handle(req)
    expect(res.status).toBe(200)
    
    const body = (await res.json()) as any
    expect(body.status).toBe('draft')
    expect(body.totalAmount).toBe('20.00')
  })

  it('GET /api/v1/invoices — lists invoices for tenant', async () => {
    // Create one first
    await app.handle(new Request(`http://localhost/api/v1/invoices`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${mainUser.accessToken}`, 
        'x-tenant-id': `${tenantId}` 
      },
      body: JSON.stringify({ items: [{ description: 'Dev', quantity: 1, unitPrice: '100', taxRate: '0' }] })
    }))

    const getReq = new Request(`http://localhost/api/v1/invoices`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${mainUser.accessToken}`, 
        'x-tenant-id': `${tenantId}` 
      }
    })

    const res = await app.handle(getReq)
    expect(res.status).toBe(200)
    
    const body = (await res.json()) as any
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBe(1)
    expect(body.data[0].status).toBe('draft')
  })

  it('POST /api/v1/invoices/:id/issue — issues a draft invoice', async () => {
    const createRes = await app.handle(new Request(`http://localhost/api/v1/invoices`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${mainUser.accessToken}`, 
        'x-tenant-id': `${tenantId}` 
      },
      body: JSON.stringify({ items: [{ description: 'Dev', quantity: 1, unitPrice: '100', taxRate: '0' }] })
    }))
    const inv = await createRes.json() as any

    const issueReq = new Request(`http://localhost/api/v1/invoices/${inv.id}/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mainUser.accessToken}`, 
        'x-tenant-id': `${tenantId}` 
      }
    })

    const res = await app.handle(issueReq)
    expect(res.status).toBe(200)
    
    const body = (await res.json()) as any
    expect(body.status).toBe('open')
    expect(body.number).toBe(1)
  })
})
