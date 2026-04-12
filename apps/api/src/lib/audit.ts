import { db } from '@entityseven/db'
import { auditLogs } from '@entityseven/db'

interface AuditOptions {
  tenantId: string
  userId?: string | null
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function logAudit(options: AuditOptions, tx?: any): Promise<void> {
  const client = tx ?? db
  await client.insert(auditLogs).values({
    tenantId: options.tenantId,
    userId: options.userId,
    action: options.action,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    metadata: options.metadata,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}
