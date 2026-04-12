import { Elysia } from 'elysia'
import { authenticate } from './authenticate'

export type Role = 'owner' | 'admin' | 'member'

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 3,
  admin: 2,
  member: 1,
}

export function requireRole(minRole: Role) {
  return new Elysia({ name: `require-role-${minRole}` })
    .use(authenticate)
    .derive({ as: 'scoped' }, async ({ user, status }) => {
      if (!user) {
        return status(401, { code: 'UNAUTHORIZED', message: 'User not authenticated' })
      }
      const userRole = user.role as Role | undefined
      const userRoleLevel = userRole ? (ROLE_HIERARCHY[userRole] ?? 0) : 0
      const requiredLevel = ROLE_HIERARCHY[minRole]

      if (userRoleLevel < requiredLevel) {
        return status(403, { code: 'FORBIDDEN', message: 'Insufficient permissions' })
      }

      return {}
    })
}
