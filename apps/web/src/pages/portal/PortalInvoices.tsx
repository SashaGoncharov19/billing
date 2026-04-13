import { useState } from 'react'
import { usePortalInvoices, usePortalInvoicePdf } from '@/lib/api-store'
import type { Invoice } from '@/lib/api-admin'
import { Receipt, Download, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function PortalInvoices() {
  const { data: invoices, isLoading } = usePortalInvoices()
  const getPdf = usePortalInvoicePdf()

  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null)

  const handleDownload = async (id: string, pdfUrl?: string) => {
    if (!pdfUrl) {
      toast.info('Invoice PDF is not available yet across the CDN. Please check back shortly.')
      return
    }
    try {
      setLoadingPdfId(id)
      const url = await getPdf.mutateAsync(id)
      window.open(url, '_blank')
    } catch(e) {
      toast.error('Could not fetch PDF')
    } finally {
      setLoadingPdfId(null)
    }
  }

  const badgeColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-100/50 text-green-700 border-green-200'
      case 'open': return 'bg-blue-100/50 text-blue-700 border-blue-200'
      case 'draft': return 'bg-gray-100/50 text-gray-700 border-gray-200'
      default: return 'bg-yellow-100/50 text-yellow-700 border-yellow-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase History</h1>
          <p className="text-muted-foreground">View and download invoices for all your purchases.</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 flex justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>
        ) : invoices?.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
            <Receipt size={48} className="opacity-20 mb-4" />
            <p className="text-lg font-medium text-foreground">No purchases yet</p>
            <p className="text-sm">When you buy a product, your invoices will appear here.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 border-b uppercase text-xs text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-4">Invoice No.</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-right">Download</th>
              </tr>
            </thead>
            <tbody>
              {invoices?.map((inv: Invoice) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium">#{String(inv.number).padStart(6, '0')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs uppercase font-bold rounded-full border ${badgeColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {inv.issuedAt ? format(new Date(inv.issuedAt), 'MMMM d, yyyy') : format(new Date(inv.createdAt), 'MMMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    {Number(inv.totalAmount).toLocaleString('en-US', { style: 'currency', currency: inv.currency })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDownload(inv.id, inv.pdfUrl)}
                      disabled={loadingPdfId === inv.id}
                      title={inv.pdfUrl ? "Download PDF" : "PDF processing. Available momentarily..."}
                      className={`inline-flex items-center justify-center p-2 rounded-lg transition-colors ${
                        inv.pdfUrl 
                          ? 'bg-primary/5 hover:bg-primary/15 text-primary' 
                          : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {loadingPdfId === inv.id ? <Loader2 size={16} className="animate-spin" /> : inv.pdfUrl ? <Download size={16} /> : <FileText size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
