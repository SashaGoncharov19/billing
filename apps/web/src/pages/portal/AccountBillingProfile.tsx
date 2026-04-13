import { useState, useEffect } from 'react'
import { usePortalMe, usePortalUpdateMe } from '@/lib/api-store'
import { Save, User, Loader2, Link } from 'lucide-react'
import { toast } from 'sonner'

export default function AccountBillingProfile() {
  const { data: user, isLoading } = usePortalMe()
  const updateMe = usePortalUpdateMe()
  
  const [formData, setFormData] = useState({
    billingName: '',
    billingAddress: '',
    billingTaxId: '',
    billingEmail: '',
    billingCountry: ''
  })

  useEffect(() => {
    if (user) {
      setFormData({
        billingName: user.billingName || '',
        billingAddress: user.billingAddress || '',
        billingTaxId: user.billingTaxId || '',
        billingEmail: user.billingEmail || '',
        billingCountry: user.billingCountry || ''
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateMe.mutateAsync(formData)
      toast.success('Billing details updated successfully')
    } catch(e: any) {
      toast.error(e.response?.data?.message || 'Failed to update details')
    }
  }

  if (isLoading) return <div className="p-8 text-muted-foreground flex items-center justify-center"><Loader2 className="animate-spin mr-2" /> Loading...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing Identity</h1>
          <p className="text-muted-foreground">Manage the legal details that appear on your purchases.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="col-span-1">
          <div className="bg-muted/30 p-6 rounded-xl border flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <User size={32} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Billing Details</h3>
              <p className="text-sm text-muted-foreground mt-2">These details are legally binding. They are stamped onto your downloaded invoices.</p>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <form onSubmit={handleSubmit} className="bg-card border rounded-xl overflow-hidden">
            <div className="p-6 space-y-4 border-b">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Link size={18} className="text-muted-foreground" />
                Customer Info
              </h2>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name / Company</label>
                <input 
                  type="text" 
                  value={formData.billingName} 
                  onChange={e => setFormData(f => ({...f, billingName: e.target.value}))} 
                  placeholder="John Doe" 
                  className="w-full p-2 rounded-md border bg-background"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Full Address</label>
                <textarea 
                  value={formData.billingAddress} 
                  onChange={e => setFormData(f => ({...f, billingAddress: e.target.value}))} 
                  placeholder="123 Main St,&#10;San Francisco, CA 94105" 
                  rows={3}
                  className="w-full p-2 rounded-md border bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax ID / VAT</label>
                  <input 
                    type="text" 
                    value={formData.billingTaxId} 
                    onChange={e => setFormData(f => ({...f, billingTaxId: e.target.value}))} 
                    placeholder="US12345678" 
                    className="w-full p-2 rounded-md border bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country (ISO)</label>
                  <input 
                    type="text" 
                    value={formData.billingCountry} 
                    onChange={e => setFormData(f => ({...f, billingCountry: e.target.value}))} 
                    maxLength={2}
                    placeholder="US" 
                    className="w-full p-2 rounded-md border bg-background uppercase"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Billing Email</label>
                <input 
                  type="email" 
                  value={formData.billingEmail} 
                  onChange={e => setFormData(f => ({...f, billingEmail: e.target.value}))} 
                  placeholder="billing@example.com" 
                  className="w-full p-2 rounded-md border bg-background"
                />
              </div>
            </div>

            <div className="p-4 bg-muted/20 flex justify-end">
              <button 
                type="submit" 
                disabled={updateMe.isPending}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {updateMe.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
