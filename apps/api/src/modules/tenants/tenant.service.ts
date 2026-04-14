import { db, tenants, memberships, users } from '@entityseven/db'
import { eq, and } from 'drizzle-orm'
import { write } from 'bun'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { emailQueue } from '@api/queue'

export class TenantService {
  /**
   * Creates a new tenant and sets the creator as the owner.
   */
  async createTenant(userId: string, data: { name: string; slug: string }) {
    // Check slug uniqueness
    const existing = await db.query.tenants.findFirst({
      where: eq(tenants.slug, data.slug),
    })

    if (existing) {
      throw new Error(`Slug '${data.slug}' is already taken.`)
    }

    return await db.transaction(async (tx) => {
      const [newTenant] = await tx
        .insert(tenants)
        .values({
          name: data.name,
          slug: data.slug,
        })
        .returning()

      await tx.insert(memberships).values({
        userId,
        tenantId: newTenant!.id,
        role: 'owner',
        joinedAt: new Date(),
      })

      // We should ideally fire an audit log here.
      return newTenant
    })
  }

  async getTenant(tenantId: string) {
    return await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    })
  }

  async updateTenant(
    tenantId: string,
    data: Partial<{ name: string; primaryColor: string; secondaryColor: string }>,
  ) {
    const [updated] = await db
      .update(tenants)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning()

    return updated
  }

  async uploadLogo(tenantId: string, file: File) {
    const extName = file.name.split('.').pop() || 'png'
    const fileName = `logo-${tenantId}-${Date.now()}.${extName}`

    // Save locally for MVP
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'tenants')
    await mkdir(uploadDir, { recursive: true })
    const filePath = join(uploadDir, fileName)

    await write(filePath, Object.assign(file, { name: fileName }))
    // For now returning basic local url
    const logoUrl = `/uploads/tenants/${fileName}`

    await db.update(tenants).set({ logoUrl, updatedAt: new Date() }).where(eq(tenants.id, tenantId))

    return { logoUrl }
  }

  async getMembers(tenantId: string) {
    // Basic join query
    const results = await db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        email: users.email,
        role: memberships.role,
        joinedAt: memberships.joinedAt,
        invitedAt: memberships.invitedAt,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.tenantId, tenantId))

    return results
  }

  async inviteMember(tenantId: string, email: string, role: 'admin' | 'member') {
    return await db.transaction(async (tx) => {
      let user = await tx.query.users.findFirst({
        where: eq(users.email, email),
      })

      let isNewUser = false
      if (!user) {
        // Create dummy user stub for invitation
        const [newUser] = await tx
          .insert(users)
          .values({
            email,
            passwordHash: '!INVITED', // unreachable
          })
          .returning()
        user = newUser
        isNewUser = true
      }

      // Check if already a member
      const existingMembership = await tx.query.memberships.findFirst({
        where: and(eq(memberships.userId, user!.id), eq(memberships.tenantId, tenantId)),
      })

      if (existingMembership) {
        throw new Error('User is already a member of this tenant')
      }

      const [membership] = await tx
        .insert(memberships)
        .values({
          userId: user!.id,
          tenantId,
          role,
          invitedAt: new Date(),
          // If they already existed, they might just join immediately or we still require them to accept.
          // For simplicity, let's treat existing users as auto-joined or just record the invite.
          joinedAt: !isNewUser ? new Date() : null,
        })
        .returning()

      if (isNewUser) {
        await emailQueue.add('send-email', {
          to: email,
          subject: 'You have been invited to Entity Seven',
          body: `You have an invitation! Please register at our portal using ${email} to access your new organization.`,
        })
      }

      return membership
    })
  }

  async updateMemberRole(tenantId: string, memberId: string, role: 'admin' | 'member') {
    // Only fetch member
    const member = await db.query.memberships.findFirst({
      where: and(eq(memberships.id, memberId), eq(memberships.tenantId, tenantId)),
    })

    if (!member) throw new Error('Member not found')
    if (member.role === 'owner') throw new Error('Cannot downgrade an owner account')

    const [updated] = await db
      .update(memberships)
      .set({ role })
      .where(and(eq(memberships.id, memberId), eq(memberships.tenantId, tenantId)))
      .returning()

    return updated
  }

  async removeMember(tenantId: string, memberId: string) {
    const member = await db.query.memberships.findFirst({
      where: and(eq(memberships.id, memberId), eq(memberships.tenantId, tenantId)),
    })

    if (!member) throw new Error('Member not found')

    if (member.role === 'owner') {
      // Check if it's the last owner
      const owners = await db.query.memberships.findMany({
        where: and(eq(memberships.tenantId, tenantId), eq(memberships.role, 'owner')),
      })

      if (owners.length <= 1) {
        throw new Error('Cannot remove the last owner of the tenant')
      }
    }

    await db
      .delete(memberships)
      .where(and(eq(memberships.id, memberId), eq(memberships.tenantId, tenantId)))
    return true
  }
}

export const tenantService = new TenantService()
