import { Elysia, t } from 'elysia'
import { db } from '@entityseven/db'
import { tenants, users, auditLogs, invoices, tickets, subscriptions, memberships, products } from '@entityseven/db'
import { eq, count, sum, desc } from 'drizzle-orm'
import { authenticate } from '../../middleware/authenticate'
import { ForbiddenError } from '../../middleware/error-handler'
import { PluginManager } from '../plugins/plugin.manager'

export const adminRouter = new Elysia({ prefix: '/api/v1/admin', name: 'admin.router' })
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
  .get('/tickets', async ({ query }) => {
    let q = db.select().from(tickets).$dynamic()

    if (query?.status) {
      q = q.where(eq(tickets.status, query.status))
    }

    const page = query?.page || 1
    const limit = query?.limit || 100
    const offset = (page - 1) * limit

    const list = await q.orderBy(desc(tickets.createdAt)).limit(limit).offset(offset)
    return { data: list, metadata: { page, limit } }
  }, {
    query: t.Optional(t.Object({
      status: t.Optional(t.Union([
        t.Literal('open'),
        t.Literal('in_progress'),
        t.Literal('waiting_customer'),
        t.Literal('resolved'),
        t.Literal('closed')
      ])),
      page: t.Optional(t.Numeric()),
      limit: t.Optional(t.Numeric())
    }))
  })
  .get('/plugins', () => {
    return PluginManager.getRegisteredPlugins()
  })
  .get('/plugins/:pluginId/options', async ({ params: { pluginId } }) => {
    const plugin = PluginManager.getPlugin(pluginId)
    if (!plugin) throw new Error('Plugin not found')
    return await plugin.getAdminOptions()
  })
  .get('/products', async () => {
    return await db.select().from(products).orderBy(desc(products.createdAt))
  })
  .post('/products', async ({ body }) => {
    const payload = { ...body, price: body.price.toString() }
    const [newProduct] = await db.insert(products).values(payload).returning()
    return newProduct
  }, {
    body: t.Object({
      tenantId: t.String(),
      name: t.String(),
      description: t.Optional(t.String()),
      price: t.Numeric(),
      currency: t.Optional(t.String()),
      billingType: t.Optional(t.Union([t.Literal('one_time'), t.Literal('recurring')])),
      billingInterval: t.Optional(t.Union([t.Literal('month'), t.Literal('year')])),
      pluginType: t.Optional(t.String()),
      pluginConfig: t.Optional(t.Any()),
    })
  })
