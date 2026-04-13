import { useParams, Link } from 'react-router-dom'
import { useAdminUserDetail } from '@/lib/api-admin'
import { Loader2, ArrowLeft, Receipt, Ticket, Box, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

export default function AdminUserDetail() {
  const { id } = useParams()
  const { data, isLoading } = useAdminUserDetail(id || '')

  if (isLoading) {
    return <div className="p-20 flex justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>
  }

  if (!data || !data.user) {
    return <div className="p-20 text-center text-muted-foreground">User not found.</div>
  }

  const { user, invoices, tickets, memberships } = data

  const badgeColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'open': return 'bg-blue-100 text-blue-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link to="/admin/users" className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Details</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            ID: <span className="font-mono text-xs p-1 bg-muted rounded">{user.id}</span>
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm md:col-span-1">
          <h3 className="font-semibold text-lg border-b pb-3 mb-4">Profile</h3>
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-muted-foreground block text-xs uppercase mb-1">Email</span>
              <span className="font-medium text-base">{user.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs uppercase mb-1">Role</span>
              <span className="uppercase font-medium tracking-wide text-xs bg-muted px-2 py-1 rounded inline-block">{user.role}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs uppercase mb-1">Registered</span>
              <span className="font-medium">{format(new Date(user.createdAt), 'PPpp')}</span>
            </div>
            <div className="pt-4 border-t">
              <span className="text-muted-foreground block text-xs uppercase mb-2">Billing Identity</span>
              <p className="text-xs">{user.billingName || 'N/A'}</p>
              <p className="text-xs">{user.billingCountry || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Right side: Activities */}
        <div className="md:col-span-2 space-y-6">
          {/* Memberships */}
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 border-b pb-3">
              <Box size={18} className="text-primary"/> Memberships
            </h3>
            {memberships?.length > 0 ? (
              <div className="space-y-3">
                {memberships.map((m: any) => (
                  <div key={m.id} className="flex justify-between items-center p-3 border rounded-lg bg-muted/20">
                    <div>
                      <div className="font-medium">Tenant: {m.tenant?.name || m.tenantId}</div>
                      <div className="text-xs text-muted-foreground uppercase">{m.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">User is not part of any tenant workspaces.</p>
            )}
          </div>

          {/* Invoices */}
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Receipt size={18} className="text-primary"/> Invoices
              </h3>
              <Link to="/admin/invoices" className="text-sm text-primary hover:underline">View All in System</Link>
            </div>
            {invoices?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 border-b text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-2">Number</th>
                      <th className="px-4 py-2">Amount</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Issued</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoices.map((inv: any) => (
                      <tr key={inv.id}>
                        <td className="px-4 py-3 font-medium">#{inv.number}</td>
                        <td className="px-4 py-3">{Number(inv.totalAmount).toLocaleString('en-US',{style:'currency',currency:inv.currency})}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider ${badgeColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(inv.createdAt), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No invoices generated by this user.</p>
            )}
          </div>

          {/* Tickets */}
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 border-b pb-3">
              <Ticket size={18} className="text-primary"/> Support Tickets
            </h3>
            {tickets?.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((t: any) => (
                  <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-muted/20 gap-2">
                    <div>
                      <Link to={`/admin/tickets/${t.id}`} className="font-medium text-primary hover:underline block">{t.subject}</Link>
                      <div className="text-xs text-muted-foreground uppercase mt-1">Status: {t.status} | Priority: {t.priority}</div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(t.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No support tickets found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
