import { db, users, auditLogs, tenants, memberships } from '@entityseven/db'
import { eq } from 'drizzle-orm'
import { hashPassword, verifyPassword } from '../../lib/password'
import { type Static } from 'elysia'
import { AuthSchema } from './auth.schema'

export class AuthService {
  static async register(input: Static<typeof AuthSchema.Register>) {
    const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1)
    if (existing.length > 0) {
      throw { status: 409, code: 'CONFLICT', message: 'Email already exists' }
    }

    const hashedPassword = await hashPassword(input.password)

    return await db.transaction(async (tx) => {
      // 1. Create User
      const [newUser] = await tx.insert(users).values({
        email: input.email,
        passwordHash: hashedPassword,
      }).returning()

      // 2. Create Personal Tenant
      const slugBase = input.tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-')
      const slug = `${slugBase}-${Date.now().toString().slice(-4)}`
      const [newTenant] = await tx.insert(tenants).values({
        name: input.tenantName,
        slug: slug
      }).returning()

      if (!newUser || !newTenant) throw new Error('Failed to create user or tenant')

      // 3. Create Membership
      await tx.insert(memberships).values({
        userId: newUser.id,
        tenantId: newTenant.id,
        role: 'member',
        joinedAt: new Date()
      })

      // 4. Create Audit Log
      await tx.insert(auditLogs).values({
        tenantId: newTenant.id,
        userId: newUser.id,
        action: 'user.registered',
      })

      return { user: newUser, tenant: newTenant }
    })
  }

  static async login(email: string, pass: string) {
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
    const user = existing[0]

    if (!user) {
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Invalid credentials' }
    }

    const isValid = await verifyPassword(user.passwordHash, pass)
    if (!isValid) {
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Invalid credentials' }
    }

    return user
  }
}
