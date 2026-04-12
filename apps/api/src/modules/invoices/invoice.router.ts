import { Elysia, t } from 'elysia'
import { InvoiceService } from './invoice.service'
import { CreateInvoiceDto, UpdateInvoiceDto, QueryInvoicesDto } from './invoice.schema'
import { authenticate } from '../../middleware/authenticate'
import { resolveTenant } from '../../middleware/tenant'

export const invoiceRouter = new Elysia({ prefix: '/invoices' })
  .use(authenticate)
  .use(resolveTenant)
  .decorate('invoiceService', new InvoiceService())
  .get('/', async ({ tenant, query, invoiceService }) => {
    return invoiceService.getInvoices(tenant.id, query.status as string)
  }, { query: QueryInvoicesDto })
  .get('/:id', async ({ params: { id }, tenant, invoiceService }) => {
    return invoiceService.getInvoiceById(tenant.id, id)
  }, { params: t.Object({ id: t.String() }) })
  .post('/', async ({ body, user, tenant, set, invoiceService }) => {
    // Requires admin or owner role effectively
    if (user.role !== 'admin' && user.role !== 'owner') {
      set.status = 403
      return { code: 'FORBIDDEN', message: 'Insufficient bounds' }
    }
    return invoiceService.createInvoice(tenant.id, user.id, body)
  }, { body: CreateInvoiceDto })
  .post('/:id/issue', async ({ params: { id }, tenant, user, set, invoiceService }) => {
    if (user.role !== 'admin' && user.role !== 'owner') {
      set.status = 403
      return { code: 'FORBIDDEN', message: 'Permission denied' }
    }
    return invoiceService.issueInvoice(tenant.id, id)
  }, { params: t.Object({ id: t.String() }) })
  .post('/:id/void', async ({ params: { id }, tenant, user, set, invoiceService }) => {
    if (user.role !== 'admin') {
      set.status = 403
      return { code: 'FORBIDDEN', message: 'Only admins can void' }
    }
    return invoiceService.voidInvoice(tenant.id, id)
  }, { params: t.Object({ id: t.String() }) })
  .get('/:id/pdf', async ({ params: { id }, tenant, invoiceService }) => {
    const url = await invoiceService.getPdfSignedUrl(tenant.id, id)
    return { url }
  }, { params: t.Object({ id: t.String() }) })
