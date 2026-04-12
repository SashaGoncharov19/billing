import { testDb } from './db'
import { api } from './api'
import { tenants, users, memberships } from '@entityseven/db'
import { hashPassword } from '../../src/lib/password'

export async function setupTestTenant() {
  const tenantId = crypto.randomUUID()
  const userId = crypto.randomUUID()
  const uniqueEmail = `admin-${Date.now()}-${Math.random()}@test.com`

  await testDb.transaction(async (tx) => {
    await tx.insert(tenants).values({
      id: tenantId,
      name: 'Test Tenant',
      slug: `test-${Date.now()}`,
    })

    await tx.insert(users).values({
      id: userId,
      email: uniqueEmail,
      passwordHash: await hashPassword('AdminPass123!'),
    })

    await tx.insert(memberships).values({
      userId,
      tenantId,
      role: 'owner',
      joinedAt: new Date(),
    })
  })

  // We fetch a valid token via the freshly registered account
  const { data, error } = await api.api.v1.auth.login.post({
    email: uniqueEmail,
    password: 'AdminPass123!',
  })

  if (error || !data || !('accessToken' in data)) {
    throw new Error('Failed to login ' + error)
  }

  return { tenantId, userId, adminToken: data.accessToken, email: uniqueEmail }
}
