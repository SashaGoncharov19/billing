import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAdminInvoices, useAdminInvoicePay, useAdminInvoicePdf, useAdminInvoiceGeneratePdf, useAdminDeleteInvoice } from '@/lib/api-admin'
import type { Invoice } from '@/lib/api-admin'
import { Receipt, Download, Loader2, CheckCircle2, Eye, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import PdfViewerModal from '@/components/ui/PdfViewerModal'

export default function AdminInvoices() {
  const [filter, setFilter] = useState<string>('')
  const { data: invoices, isLoading } = useAdminInvoices(filter || undefined)
  const markPaid = useAdminInvoicePay()
  const getPdf = useAdminInvoicePdf()
  const generatePdf = useAdminInvoiceGeneratePdf()
  const deleteInvoice = useAdminDeleteInvoice()

  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null)

  const handleOpenViewer = (id: string, pdfUrl?: string) => {
    if (!pdfUrl) {
      toast.info('Invoice PDF is not available yet across the CDN. Please check back shortly.')
      return
    }
    setActiveInvoiceId(id)
    setModalOpen(true)
  }

  const fetchPdfWrapper = useCallback(async () => {
    if (!activeInvoiceId) throw new Error('No invoice selected')
    return await getPdf.mutateAsync(activeInvoiceId)
  }, [activeInvoiceId, getPdf])

  const handleDownloadDirect = async (id: string, pdfUrl?: string) => {
    if (!pdfUrl) return
    try {
      setLoadingPdfId(id)
      const url = await getPdf.mutateAsync(id)
      window.open(url, '_blank')
    } catch (e) {
      toast.error('Could not fetch PDF')
    } finally {
      setLoadingPdfId(null)
    }
  }

  const handleMarkPaid = async (id: string) => {
    if (!confirm('Are you sure you want to mark this invoice as paid manually? This will grant the user their products.')) return
    try {
      await markPaid.mutateAsync(id)
      toast.success('Invoice marked as paid!')
    } catch (err) { const e = err as {response?: {data?: {message?: string}}};
      toast.error(e.response?.data?.message || 'Failed to mark as paid')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this invoice? This action cannot be undone.')) return
    try {
      await deleteInvoice.mutateAsync(id)
      toast.success('Invoice deleted successfully')
    } catch (err) { const e = err as {response?: {data?: {message?: string}}};
      toast.error('Failed to delete invoice')
    }
  }

  const badgeColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200'
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage all user invoices and payments.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="p-2 border rounded-md bg-card text-sm"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="paid">Paid</option>
            <option value="draft">Draft</option>
            <option value="void">Void</option>
          </select>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>
        ) : invoices?.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
            <Receipt size={48} className="opacity-20 mb-4" />
            <p>No invoices found.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b uppercase text-xs text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Number</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">User ID </th>
                <th className="px-6 py-4">Issued</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices?.map((inv: Invoice) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-4 font-mono font-medium">#{String(inv.number).padStart(6, '0')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs uppercase font-bold rounded-full border ${badgeColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 truncate max-w-[150px]">
                    {inv.createdByUserId ? (
                      <Link to={`/admin/users/${inv.createdByUserId}`} className="text-primary hover:underline">
                        {inv.createdByUserId}
                      </Link>
                    ) : 'System'}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {inv.issuedAt ? format(new Date(inv.issuedAt), 'MMM d, yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    {Number(inv.totalAmount).toLocaleString('en-US', { style: 'currency', currency: inv.currency })}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    {inv.status === 'open' && (
                      <button
                        onClick={() => handleMarkPaid(inv.id)}
                        disabled={markPaid.isPending}
                        title="Mark as Paid"
                        className="p-2 hover:bg-green-100 text-green-600 rounded-md disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}

                    {!inv.pdfUrl ? (
                      <button
                        onClick={() => generatePdf.mutate(inv.id)}
                        disabled={generatePdf.isPending}
                        title="Generate PDF manually"
                        className="inline-flex items-center justify-center p-2 rounded-lg transition-colors bg-primary/10 hover:bg-primary/20 text-primary"
                      >
                        {generatePdf.isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleOpenViewer(inv.id, inv.pdfUrl)}
                          title="View Invoice"
                          className="inline-flex items-center justify-center p-2 rounded-lg transition-colors bg-primary/5 hover:bg-primary/15 text-primary"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          onClick={() => handleDownloadDirect(inv.id, inv.pdfUrl)}
                          disabled={loadingPdfId === inv.id}
                          title="Download PDF"
                          className="inline-flex items-center justify-center p-2 rounded-lg transition-colors bg-primary/5 hover:bg-primary/15 text-primary"
                        >
                          {loadingPdfId === inv.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        </button>
                      </>
                    )}
                    
                    <button 
                      onClick={() => handleDelete(inv.id)}
                      disabled={deleteInvoice.isPending}
                      title="Delete Invoice"
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PdfViewerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        pdfUrlFn={fetchPdfWrapper}
        title={`Invoice ${invoices?.find((i: Invoice) => i.id === activeInvoiceId)?.number ? `#${String(invoices.find((i: Invoice) => i.id === activeInvoiceId).number).padStart(6, '0')}` : ''}`}
      />
    </div>
  )
}
