import { pgTable, uuid, timestamp, pgEnum, index, unique } from 'drizzle-orm/pg-core'
import { users } from './users'
import { tenants } from './tenants'

export const membershipRoleEnum = pgEnum('membership_role', ['owner', 'admin', 'member'])

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  role: membershipRoleEnum('role').default('member').notNull(),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique().on(table.userId, table.tenantId),
  index('memberships_tenant_idx').on(table.tenantId),
  index('memberships_user_idx').on(table.userId),
])

export type Membership = typeof memberships.$inferSelect
export type NewMembership = typeof memberships.$inferInsert
