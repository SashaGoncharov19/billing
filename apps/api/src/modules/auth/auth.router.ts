import { Elysia } from 'elysia'
import { AuthSchema } from './auth.schema'
import { AuthService } from './auth.service'
import { loginRateLimiter } from '../../middleware/rate-limit'
import { jwtSetup } from '../../lib/jwt'
import { redis } from 'bun'
import { authenticate } from '../../middleware/authenticate'
import { db, memberships, tenants, users, auditLogs } from '@entityseven/db'
import { eq } from 'drizzle-orm'

export const authRouter = new Elysia({ prefix: '/auth' })
  .use(jwtSetup)
  .post('/register', async ({ body, accessJwt, refreshJwt, cookie: { __refresh_token }, set, status }) => {
    try {
      const { user, tenant } = await AuthService.register(body)

      const accessToken = await accessJwt.sign({
        sub: user.id,
        email: user.email,
        tenantId: tenant.id,
        role: 'owner'
      })

      const refreshToken = await refreshJwt.sign({
        sub: user.id
      })

      if (__refresh_token) {
        __refresh_token.value = refreshToken
        __refresh_token.httpOnly = true
        __refresh_token.secure = true
        __refresh_token.sameSite = 'strict'
        __refresh_token.maxAge = 604800 // 7 days
      }

      set.status = 201
      return {
        user: { id: user.id, email: user.email },
        tenant,
        accessToken,
        expiresIn: 900
      }
    } catch (err: unknown) {
      const error = err as { status?: number, code?: string, message?: string }
      if (error.status) {
        return status(error.status, error)
      }
      return status(500, { code: 'INTERNAL_ERROR', message: error.message || 'Unknown error' })
    }
  }, { body: AuthSchema.Register })
  // .use(loginRateLimiter)
  .post('/login', async ({ body, accessJwt, refreshJwt, cookie: { __refresh_token }, status }) => {
    try {
      const user = await AuthService.login(body.email, body.password)

      // Get first tenant for payload
      const [membershipWithTenant] = await db.select({
        tenantId: memberships.tenantId,
        role: memberships.role,
        tenant: tenants
      })
        .from(memberships)
        .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
        .where(eq(memberships.userId, user.id))
        .limit(1)

      const accessToken = await accessJwt.sign({
        sub: user.id,
        email: user.email,
        tenantId: membershipWithTenant?.tenantId,
        role: membershipWithTenant?.role
      })

      const refreshToken = await refreshJwt.sign({
        sub: user.id
      })

      if (__refresh_token) {
        __refresh_token.value = refreshToken
        __refresh_token.httpOnly = true
        __refresh_token.secure = true
        __refresh_token.sameSite = 'strict'
        __refresh_token.maxAge = 604800 // 7 days
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          theme: user.theme,
          preferredLanguage: user.preferredLanguage,
          role: membershipWithTenant?.role
        },
        tenant: membershipWithTenant?.tenant ?? null,
        accessToken,
        expiresIn: 900
      }
    } catch (err: unknown) {
      const error = err as { status?: number, code?: string, message?: string }
      if (error.status) {
        return status(error.status, error)
      }
      return status(500, { code: 'INTERNAL_ERROR', message: error.message || 'Unknown error' })
    }
  }, { body: AuthSchema.Login })
  .post('/refresh', async ({ cookie: { __refresh_token }, refreshJwt, accessJwt, status }) => {
    const token = __refresh_token?.value as string | undefined
    if (!token) return status(401, { code: 'UNAUTHORIZED', message: 'No refresh token' })

    // Check blacklist
    const isBlacklisted = await redis.get(`bl_token:${token}`)
    if (isBlacklisted) {
      return status(401, { code: 'UNAUTHORIZED', message: 'Invalid refresh token' })
    }

    const payload = await refreshJwt.verify(token)
    if (!payload || !payload.sub) {
      return status(401, { code: 'TOKEN_EXPIRED', message: 'Invalid or expired refresh token' })
    }

    const existingUsers = await db.select().from(users).where(eq(users.id, payload.sub as string)).limit(1)
    const user = existingUsers[0]
    if (!user) return status(401, { code: 'UNAUTHORIZED', message: 'User not found' })

    const [membership] = await db.select({
      tenantId: memberships.tenantId,
      role: memberships.role
    }).from(memberships).where(eq(memberships.userId, user.id)).limit(1)

    // Add old token to blacklist
    await redis.setex(`bl_token:${token}`, 604800, '1')

    const newAccessToken = await accessJwt.sign({
      sub: user.id,
      email: user.email,
      tenantId: membership?.tenantId,
      role: membership?.role
    })
    const newRefreshToken = await refreshJwt.sign({ sub: user.id })

    if (__refresh_token) {
      __refresh_token.value = newRefreshToken
    }

    return {
      accessToken: newAccessToken,
      expiresIn: 900
    }
  })
  .use(authenticate)
  .post('/logout', async ({ cookie: { __refresh_token }, user }) => {
    const token = __refresh_token?.value
    if (token) {
      await redis.setex(`bl_token:${token}`, 604800, '1')
      __refresh_token.remove()
    }

    if (user.tenantId) {
      await db.insert(auditLogs).values({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'user.logout'
      })
    }

    return { success: true }
  })
  .get('/me', async ({ user }) => {
    const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.id) })

    const userMemberships = await db.select({
      tenantId: memberships.tenantId,
      role: memberships.role,
      tenantName: tenants.name
    })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(eq(memberships.userId, user.id))

    return {
      id: user.id,
      email: user.email,
      theme: 'light',
      preferredLanguage: 'en',
      role: userMemberships[0]?.role, // Pick current context role, usually they have 1
      memberships: userMemberships,
      billingName: dbUser?.billingName,
      billingAddress: dbUser?.billingAddress,
      billingTaxId: dbUser?.billingTaxId,
      billingEmail: dbUser?.billingEmail,
      billingCountry: dbUser?.billingCountry
    }
  })
  .patch('/me', async ({ body, user, set }) => {
    try {
      const [updated] = await db.update(users)
        .set(body)
        .where(eq(users.id, user.id))
        .returning()
      return updated
    } catch (e) {
      set.status = 500
      return { message: 'Failed to update user' }
    }
  }, { body: AuthSchema.UpdateMe })
  .post('/switch-tenant', async ({ body, user, accessJwt, set }) => {
    try {
      const u = user as unknown as { id?: string; sub?: string }
      if (!u || (!u.id && !u.sub)) {
        set.status = 401
        return 'Unauthorized'
      }

      const userId = u.id || (u.sub as string);

      // Check if user has membership in target tenant
      const userMemberships = await db.select({
        tenantId: memberships.tenantId,
        role: memberships.role
      })
        .from(memberships)
        .where(eq(memberships.userId, userId))

      const targetMembership = userMemberships.find(m => m.tenantId === body.tenantId)

      if (!targetMembership) {
        set.status = 403
        return { code: 'FORBIDDEN', message: 'You are not a member of this tenant' }
      }

      const newAccessToken = await accessJwt.sign({
        sub: userId,
        email: user.email as string,
        tenantId: targetMembership.tenantId,
        role: targetMembership.role
      })

      const targetTenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, body.tenantId)
      })

      return {
        accessToken: newAccessToken,
        tenant: targetTenant
      }
    } catch (e) {
      console.error(e)
      set.status = 500
      return 'Internal Server Error'
    }
  }, { body: AuthSchema.SwitchTenant })

