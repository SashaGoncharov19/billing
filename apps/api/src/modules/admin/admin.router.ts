import { Elysia, t } from 'elysia'
import { db } from '@entityseven/db'
import {
  tenants,
  users,
  auditLogs,
  invoices,
  tickets,
  subscriptions,
  memberships,
  products,
  appSettings,
} from '@entityseven/db'
import { eq, count, sum, desc, isNull } from 'drizzle-orm'
import { authenticate } from '@api/middleware/authenticate'
import { ForbiddenError } from '@api/middleware/error-handler'
import { PluginManager } from '../plugins/plugin.manager'
import { ProductsService } from '../products/products.service'
import { currencyRouter } from './currency.router'
import { paymentMethodsRouter } from './payment-methods.router'
import { taxRatesRouter } from './tax-rates.router'
import { pdfQueue } from '@api/queue'

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
    const openTicketsRes = await db
      .select({ count: count() })
      .from(tickets)
      .where(eq(tickets.status, 'open'))
    const activeSubsRes = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'))
    const revenueRes = await db
      .select({ total: sum(invoices.totalAmount) })
      .from(invoices)
      .where(eq(invoices.status, 'paid'))

    return {
      totalTenants: totalTenantsRes[0]?.count ?? 0,
      openTickets: openTicketsRes[0]?.count ?? 0,
      activeSubs: activeSubsRes[0]?.count ?? 0,
      revenue: revenueRes[0]?.total ?? 0,
    }
  })
  .get('/settings', async () => {
    const settings = await db.query.appSettings.findFirst({
      where: eq(appSettings.id, 'global'),
    })
    return settings || { id: 'global' }
  })
  .patch(
    '/settings',
    async ({ body }) => {
      const existing = await db.query.appSettings.findFirst({
        where: eq(appSettings.id, 'global'),
      })

      if (existing) {
        const [updated] = await db
          .update(appSettings)
          .set({ ...(body as any), updatedAt: new Date() })
          .where(eq(appSettings.id, 'global'))
          .returning()
        return updated
      } else {
        const [created] = await db
          .insert(appSettings)
          .values({ ...(body as any), id: 'global' })
          .returning()
        return created
      }
    },
    {
      body: t.Object({
        billingEntity: t.Optional(t.String()),
        billingAddress: t.Optional(t.String()),
        billingTaxId: t.Optional(t.String()),
        billingEmail: t.Optional(t.String()),
        billingCountry: t.Optional(t.String()),
        logoUrl: t.Optional(t.String()),
        primaryColor: t.Optional(t.String()),
        secondaryColor: t.Optional(t.String()),
        customCss: t.Optional(t.String()),
      }),
    },
  )
  .get('/tenants', async () => {
    const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt))
    return allTenants
  })
  .get(
    '/tenants/:id',
    async ({ params: { id } }) => {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, id),
      })
      if (!tenant) throw new Error('Tenant not found')

      const membersList = await db.select().from(memberships).where(eq(memberships.tenantId, id))
      const invoicesList = await db.select().from(invoices).where(eq(invoices.tenantId, id))

      return { tenant, members: membersList, invoices: invoicesList }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
    },
  )
  .patch(
    '/tenants/:id/suspend',
    async ({ params: { id } }) => {
      const [suspended] = await db
        .update(tenants)
        .set({ deletedAt: new Date() })
        .where(eq(tenants.id, id))
        .returning()
      return suspended
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
    },
  )
  .get('/users', async () => {
    const allUsers = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
      with: { memberships: true },
    })
    return allUsers.map((u) => ({
      ...u,
      role: u.memberships?.[0]?.role || 'user',
    }))
  })
  .get('/users/:id', async ({ params: { id } }) => {
    const userDb = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: { memberships: true },
    })
    if (!userDb) throw new Error('User not found')

    const user = {
      ...userDb,
      role: userDb.memberships?.[0]?.role || 'user',
    }

    // Get invoices by this user
    const userInvoices = await db.query.invoices.findMany({
      where: eq(invoices.createdByUserId, id),
      orderBy: [desc(invoices.createdAt)],
    })

    // Get tickets
    const userTickets = await db.query.tickets.findMany({
      where: eq(tickets.createdByUserId, id),
      orderBy: [desc(tickets.createdAt)],
    })

    // Get memberships
    const userMemberships = await db.query.memberships.findMany({
      where: eq(memberships.userId, id),
      with: { tenant: true },
    })

    return {
      user,
      invoices: userInvoices,
      tickets: userTickets,
      memberships: userMemberships,
    }
  })
  .get('/audit-logs', async () => {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100)
    return logs
  })
  .get('/invoices', async () => {
    const items = await db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(100)
    return items
  })
  .patch(
    '/invoices/:id/approve',
    async ({ params: { id } }) => {
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id))
      if (!invoice) throw new Error('Invoice not found')

      // Process approval
      await db
        .update(invoices)
        .set({
          status: 'paid',
          paidAmount: invoice.totalAmount,
          paidAt: new Date(),
        })
        .where(eq(invoices.id, id))

      await pdfQueue.add('generate-pdf', {
        type: 'invoice',
        data: { tenantId: invoice.tenantId, invoiceId: id },
      })

      // Simulate Email Send
      console.log(`[EMAIL DISPATCH] Mock sending Payment Confirmed email to user for invoice ${id}`)

      return { success: true }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
    },
  )
  .delete(
    '/invoices/:id',
    async ({ params: { id } }) => {
      await db.delete(invoices).where(eq(invoices.id, id))
      return { success: true }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
    },
  )
  .get(
    '/tickets',
    async ({ query }) => {
      let q = db.select().from(tickets).$dynamic()

      if (query?.status) {
        q = q.where(eq(tickets.status, query.status))
      }

      const page = query?.page || 1
      const limit = query?.limit || 100
      const offset = (page - 1) * limit

      const list = await q.orderBy(desc(tickets.createdAt)).limit(limit).offset(offset)
      return { data: list, metadata: { page, limit } }
    },
    {
      query: t.Optional(
        t.Object({
          status: t.Optional(
            t.Union([
              t.Literal('open'),
              t.Literal('in_progress'),
              t.Literal('waiting_customer'),
              t.Literal('resolved'),
              t.Literal('closed'),
            ]),
          ),
          page: t.Optional(t.Numeric()),
          limit: t.Optional(t.Numeric()),
        }),
      ),
    },
  )
  .get('/plugins', () => {
    return PluginManager.getRegisteredPlugins()
  })
  .get('/plugins/:pluginId/options', async ({ params: { pluginId } }) => {
    const plugin = PluginManager.getPlugin(pluginId)
    if (!plugin) throw new Error('Plugin not found')
    return plugin.getAdminOptions()
  })
  .get('/products', async () => {
    return db
      .select()
      .from(products)
      .where(isNull(products.deletedAt))
      .orderBy(desc(products.createdAt))
  })
  .post(
    '/products',
    async ({ body }) => {
      const productsService = new ProductsService()

      const payload: Parameters<typeof productsService.createProduct>[1] = {
        name: body.name,
        price: body.price.toString(),
        billingType: body.billingType || 'one_time',
      }

      if (body.description !== undefined) payload.description = body.description
      if (body.currency !== undefined) payload.currency = body.currency
      if (body.setupFee !== undefined) payload.setupFee = body.setupFee.toString()
      if (body.pluginType !== undefined) payload.pluginType = body.pluginType
      if (body.pluginConfig !== undefined) payload.pluginConfig = body.pluginConfig
      if (body.billingInterval !== undefined) payload.billingInterval = body.billingInterval

      return productsService.createProduct(body.tenantId, payload)
    },
    {
      body: t.Object({
        tenantId: t.String(),
        name: t.String(),
        description: t.Optional(t.String()),
        price: t.Numeric(),
        setupFee: t.Optional(t.Numeric()),
        currency: t.Optional(t.String()),
        billingType: t.Optional(t.Union([t.Literal('one_time'), t.Literal('recurring')])),
        billingInterval: t.Optional(t.Union([t.Literal('month'), t.Literal('year')])),
        pluginType: t.Optional(t.String()),
        pluginConfig: t.Optional(t.Unknown()),
      }),
    },
  )
  .patch(
    '/products/:id',
    async ({ params: { id }, body }) => {
      const productsService = new ProductsService()
      const payload: Record<string, unknown> = { ...body }
      if (payload.setupFee !== undefined) payload.setupFee = payload.setupFee?.toString()
      if (payload.price !== undefined) payload.price = payload.price?.toString()
      delete payload.tenantId
      return await productsService.updateProduct(body.tenantId, id, payload as any)
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        tenantId: t.String(),
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        price: t.Optional(t.Numeric()),
        setupFee: t.Optional(t.Numeric()),
        currency: t.Optional(t.String()),
        pluginType: t.Optional(t.String()),
        pluginConfig: t.Optional(t.Unknown()),
        isActive: t.Optional(t.Boolean()),
      }),
    },
  )
  .delete(
    '/products/:id',
    async ({ params: { id }, query }) => {
      const productsService = new ProductsService()
      if (!query.tenantId) throw new Error('tenantId is required')
      return productsService.deleteProduct(query.tenantId, id)
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
    },
  )
  .use(currencyRouter)
  .use(paymentMethodsRouter)
  .use(taxRatesRouter)
