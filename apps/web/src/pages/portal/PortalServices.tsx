import { useState } from 'react'
import { usePortalServices, useDeleteService, useTopUpBalance } from '@/lib/api-services'
import { useAuthStore } from '@/store/auth.store'
import { Server, Trash2, Wallet, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

export interface Service {
  id: string
  name: string
  status: string
  monthlyPrice: string | number
  hourlyPrice: string | number
}

interface ApiError {
  response?: {
    data?: {
      message?: string
    }
  }
}

export default function PortalServices() {
  const { tenant } = useAuthStore()
  const isTenantLoading = !tenant
  const { data: services, isLoading: isServicesLoading } = usePortalServices(tenant?.id)

  const topUpMut = useTopUpBalance()
  const deleteMut = useDeleteService()

  const [topUpModal, setTopUpModal] = useState(false)
  const [customAmount, setCustomAmount] = useState('')

  const handleTopUp = async (amount: number) => {
    try {
      const res = await topUpMut.mutateAsync({
        amount,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      })
      if (res.url) window.location.assign(res.url)
    } catch(e) {
      const apiErr = e as ApiError
      toast.error(apiErr.response?.data?.message || 'Failed to start top up')
    }
  }

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Are you certain you want to destroy this service? You will be billed for the fractional usage.')) return
    try {
      await deleteMut.mutateAsync(serviceId)
      toast.success('Service successfully destroyed')
    } catch(e) {
      const apiErr = e as ApiError
      toast.error(apiErr.response?.data?.message || 'Failed to delete service')
    }
  }

  if (isTenantLoading || isServicesLoading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Account Balance Widget */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-primary-foreground shadow-lg flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-inner">
            <Wallet size={32} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-primary-foreground/80">Project Balance</h2>
            <div className="text-4xl font-black mt-1 tracking-tight">
              ${Number(tenant?.accountBalance || 0).toFixed(2)}
            </div>
          </div>
        </div>
        <div className="mt-6 md:mt-0">
          <button
            onClick={() => setTopUpModal(true)}
            className="bg-white text-primary px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
          >
            Add Funds
          </button>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Active Services</h2>
          <Link to="/portal/shop" className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg font-medium hover:bg-primary/20">
            <Plus size={16} /> Order Service
          </Link>
        </div>

        {services?.length === 0 ? (
          <div className="text-center p-12 bg-card border border-dashed rounded-xl border-muted-foreground/30">
            <Server size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg text-foreground">No active services</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              Your project doesn't have any running services. Order a new service to get started.
            </p>
            <Link to="/portal/shop" className="inline-block mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-lg">
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services?.map((s: Service) => (
              <div key={s.id} className="bg-card border rounded-xl p-5 shadow-sm relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-1 h-full ${s.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{s.name}</h3>
                    <p className="text-sm font-medium text-muted-foreground uppercase mt-1 px-2 py-0.5 bg-muted rounded inline-block">
                      {s.status}
                    </p>
                  </div>
                  <Server className="text-muted-foreground/30" size={24} />
                </div>

                <div className="mt-6">
                  <div className="flex justify-between text-sm py-1 border-b">
                    <span className="text-muted-foreground">Monthly</span>
                    <span className="font-medium">${s.monthlyPrice}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-muted-foreground">Burn Rate</span>
                    <span className="font-medium">${Number(s.hourlyPrice).toFixed(3)}/hr</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t flex justify-end">
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                    title="Destroy Service"
                  >
                    <Trash2 size={16} /> Destroy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Up Modal */}
      {topUpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6">
              <h3 className="text-xl font-bold">Top Up Balance</h3>
              <p className="text-muted-foreground text-sm mt-1">Add credits to your project ledger.</p>

              <div className="grid grid-cols-3 gap-3 mt-6">
                {[10, 20, 50].map(amt => (
                  <button
                    key={amt}
                    onClick={() => handleTopUp(amt)}
                    disabled={topUpMut.isPending}
                    className="py-3 border-2 border-primary/20 rounded-xl font-bold hover:border-primary hover:bg-primary/5 transition-all text-lg"
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or custom amount</span></div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    placeholder="100.00"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border bg-background text-lg font-bold"
                  />
                </div>
                <button
                  onClick={() => {
                    const val = Number(customAmount)
                    if (val >= 5) handleTopUp(val)
                    else toast.error('Minimum top-up is $5')
                  }}
                  disabled={topUpMut.isPending || !customAmount}
                  className="bg-primary text-primary-foreground px-6 font-bold rounded-xl whitespace-nowrap"
                >
                  Pay
                </button>
              </div>
            </div>
            <div className="p-4 bg-muted/30 flex justify-end">
              <button
                onClick={() => setTopUpModal(false)}
                className="text-muted-foreground hover:text-foreground font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
