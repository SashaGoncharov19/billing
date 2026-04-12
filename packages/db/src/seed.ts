import { db } from './client'
import * as schema from './schema'

async function main() {
  console.log('Seeding database...')

  // 1. Create tenant
  const [tenant] = await db.insert(schema.tenants).values({
    name: 'Entity Seven Demo',
    slug: 'es-demo'
  }).returning()

  // 2. Create admin user
  const [user] = await db.insert(schema.users).values({
    email: 'admin@entityseven.com',
    passwordHash: '$2a$12$R9h/cIPz0gi.URNNX3N1xO...' // Fake hash for seed
  }).returning()

  // 3. Create membership
  await db.insert(schema.memberships).values({
    userId: user!.id,
    tenantId: tenant!.id,
    role: 'owner',
    joinedAt: new Date()
  })

  // 4. Create products
  await db.insert(schema.products).values([
    {
      tenantId: tenant!.id,
      name: 'Pro Plan',
      description: 'Monthly pro subscription',
      price: '29.99',
      billingType: 'recurring',
      billingInterval: 'month',
      isActive: true
    },
    {
      tenantId: tenant!.id,
      name: 'Enterprise Setup',
      description: 'One-time setup fee',
      price: '499.00',
      billingType: 'one_time',
      isActive: true
    }
  ])

  // 5. Create invoice
  await db.insert(schema.invoices).values({
    tenantId: tenant!.id,
    number: 1,
    status: 'paid',
    subtotalAmount: '29.99',
    totalAmount: '29.99',
    createdByUserId: user!.id
  })

  console.log('Seeding completed!')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
