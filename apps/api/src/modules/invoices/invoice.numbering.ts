import { eq, desc, and, isNotNull } from 'drizzle-orm'
import { invoices } from '@entityseven/db'

export async function getNextInvoiceNumber(tenantId: string, tx: any /* TODO: FIX */): Promise<number> {
  const result = await tx
    .select({ maxNumber: invoices.number })
    .from(invoices)
    .where(and(eq(invoices.tenantId, tenantId), isNotNull(invoices.number)))
    .orderBy(desc(invoices.number))
    .limit(1)
    .for('update')

  return (result[0]?.maxNumber ?? 0) + 1
}
