import { db, users, tenants, memberships } from '@entityseven/db'
import { eq } from 'drizzle-orm'
import { logger } from './logger'

export async function bootstrapDatabase() {
  logger.info('Checking database for required seed data...')

  try {
    // Check if the default admin user exists
    const adminEmail = 'admin@entityseven.com'
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.email, adminEmail)
    })

    if (!existingAdmin) {
      logger.info('No admin user found. Creating default admin and tenant...')

      // Use dynamic import so it doesn't break if run in a Node context occasionally, 
      // though this app is bun-native
      const hashPassword = typeof Bun !== 'undefined' 
        ? await Bun.password.hash('admin123', { algorithm: 'argon2id' }) 
        : 'admin123' // Fallback shouldn't happen in our bun env

      await db.transaction(async (tx) => {
        // 1. Create Tenant
        const [tenant] = await tx.insert(tenants).values({
          name: 'Entity Seven System',
          slug: 'entityseven-system'
        }).returning()

        // 2. Create User
        const [admin] = await tx.insert(users).values({
          email: adminEmail,
          passwordHash: hashPassword
        }).returning()

        // 3. Create Membership (Owner)
        await tx.insert(memberships).values({
          userId: admin!.id,
          tenantId: tenant!.id,
          role: 'owner'
        })
      })

      logger.info(`✅ Successfully seeded database. Admin User: ${adminEmail} / Password: admin123`)
    } else {
      logger.info('Database already seeded.')
    }
  } catch (error) {
    logger.error({ error }, 'Failed to bootstrap database')
  }
}
