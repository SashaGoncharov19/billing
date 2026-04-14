import { db, services, tenants, products, balanceLogs } from '@entityseven/db'
import { eq, and } from 'drizzle-orm'
import { PluginManager } from '@api/modules/plugins/plugin.manager'

export class ServicesService {
  async getServicesByTenant(tenantId: string) {
    return await db.query.services.findMany({
      where: eq(services.tenantId, tenantId),
    })
  }

  async orderService(tenantId: string, productId: string) {
    return await db.transaction(async (tx) => {
      const product = await tx.query.products.findFirst({ where: eq(products.id, productId) })
      if (!product) throw new Error('Product not found')

      const tenant = await tx.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
      if (!tenant) throw new Error('Tenant not found')

      const monthlyPrice = Number(product.price) || 0
      const hourlyPrice = monthlyPrice / 730
      
      // Calculate first hour cost
      const firstHourCost = hourlyPrice
      const currentBalance = Number(tenant.accountBalance)

      if (currentBalance < firstHourCost && monthlyPrice > 0) {
        throw new Error('Insufficient balance to start service. Please top up your account.')
      }

      const newBalance = currentBalance - firstHourCost
      
      await tx.update(tenants).set({ accountBalance: newBalance.toFixed(2) }).where(eq(tenants.id, tenantId))

      const [newService] = await tx.insert(services).values({
        tenantId,
        productId,
        name: product.name,
        provider: 'manual',
        status: 'active',
        monthlyPrice: monthlyPrice.toFixed(2),
        hourlyPrice: hourlyPrice.toFixed(5),
        pluginData: product.pluginConfig,
        lastBilledAt: new Date()
      }).returning()
      
      if (monthlyPrice > 0) {
        await tx.insert(balanceLogs).values({
          tenantId,
          amount: (-firstHourCost).toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          type: 'first_hour_charge',
          referenceId: newService.id,
          description: `Upfront first-hour deduction for ${product.name}`,
        })
      }

      // Provision logic if any plugin is attached
      if (product.pluginType) {
        await PluginManager.dispatch('provision', product.pluginType, tenantId, newService.id, product.pluginConfig)
      }

      return newService
    })
  }

  async deleteService(tenantId: string, serviceId: string) {
    return await db.transaction(async (tx) => {
      const service = await tx.query.services.findFirst({
        where: and(eq(services.id, serviceId), eq(services.tenantId, tenantId))
      })

      if (!service) throw new Error('Service not found')

      const hourlyPrice = Number(service.hourlyPrice)
      
      // Calculate fraction of hour since lastBilledAt
      const now = new Date()
      const lastBilled = new Date(service.lastBilledAt || service.createdAt)
      let diffMs = now.getTime() - lastBilled.getTime()
      
      // Just in case time anomalies occur, don't refund if negative
      if (diffMs < 0) diffMs = 0

      if (diffMs > 0 && hourlyPrice > 0) {
        const hoursPassed = diffMs / (1000 * 60 * 60)
        let deductionAmount = hoursPassed * hourlyPrice

        const tenant = await tx.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
        const newBalance = Number(tenant!.accountBalance) - deductionAmount

        await tx.update(tenants).set({ accountBalance: newBalance.toFixed(2) }).where(eq(tenants.id, tenantId))

        await tx.insert(balanceLogs).values({
          tenantId,
          amount: (-deductionAmount).toFixed(4),
          balanceAfter: newBalance.toFixed(2),
          type: 'deletion_charge',
          referenceId: service.id,
          description: `Fractional usage charge (${hoursPassed.toFixed(3)} hrs) upon deletion of ${service.name}`,
        })
      }

      const product = await tx.query.products.findFirst({ where: eq(products.id, service.productId) })
      if (product?.pluginType) {
        await PluginManager.dispatch('deprovision', product.pluginType, tenantId, service.id, product.pluginConfig)
      }

      await tx.delete(services).where(eq(services.id, serviceId))
      
      return { success: true }
    })
  }
}
