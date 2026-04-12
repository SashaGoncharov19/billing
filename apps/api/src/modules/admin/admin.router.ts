import { Elysia, t } from 'elysia'
import { db } from '@entityseven/db'
import { tenants, users, auditLogs, invoices, tickets, subscriptions, memberships } from '@entityseven/db'
import { eq, count, sum, desc } from 'drizzle-orm'
import { authenticate } from '../../middleware/authenticate'
import { ForbiddenError } from '../../middleware/error-handler'

export const adminRouter = new Elysia({ prefix: '/api/admin', name: 'admin.router' })
  .use(authenticate)
  .derive(({ user }) => {
    if (user.role !== 'owner' && user.role !== 'admin') {
      throw new ForbiddenError('Admin access required')
    }
    return { user }
  })
  .get('/stats', async () => {
    const totalTenantsRes = await db.select({ count: count() }).from(tenants)
    const openTicketsRes = await db.select({ count: count() }).from(tickets).where(eq(tickets.status, 'open'))
    const activeSubsRes = await db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, 'active'))
    const revenueRes = await db.select({ total: sum(invoices.totalAmount) }).from(invoices).where(eq(invoices.status, 'paid'))

    return {
      totalTenants: totalTenantsRes[0]?.count ?? 0,
      openTickets: openTicketsRes[0]?.count ?? 0,
      activeSubs: activeSubsRes[0]?.count ?? 0,
      revenue: revenueRes[0]?.total ?? 0
    }
  })
  .get('/tenants', async () => {
    const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt))
    return allTenants
  })
  .get('/tenants/:id', async ({ params: { id } }) => {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, id),
    })
    if (!tenant) throw new Error('Tenant not found')

    const membersList = await db.select().from(memberships).where(eq(memberships.tenantId, id))
    const invoicesList = await db.select().from(invoices).where(eq(invoices.tenantId, id))

    return { tenant, members: membersList, invoices: invoicesList }
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' })
    })
  })
  .patch('/tenants/:id/suspend', async ({ params: { id } }) => {
    const [suspended] = await db.update(tenants)
      .set({ deletedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning()
    return suspended
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' })
    })
  })
  .get('/users', async () => {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt))
    return allUsers
  })
  .get('/audit-logs', async () => {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100)
    return logs
  })
  .get('/invoices', async () => {
    const items = await db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(100)
    return items
  })
  .get('/tickets', async () => {
    const list = await db.select().from(tickets).orderBy(desc(tickets.createdAt)).limit(100)
    return list
  })
