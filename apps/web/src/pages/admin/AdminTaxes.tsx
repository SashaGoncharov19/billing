import { useState } from 'react'
import { useAdminTaxes, useAdminCreateTax, useAdminDeleteTax } from '@/lib/api-admin'
import { Loader2, Plus, Trash2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminTaxes() {
  const { data: taxes, isLoading } = useAdminTaxes()
  const createTax = useAdminCreateTax()
  const deleteTax = useAdminDeleteTax()

  const [countryCode, setCountryCode] = useState('')
  const [taxRate, setTaxRate] = useState<number | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!countryCode || taxRate === '') return

    setIsSubmitting(true)
    try {
      await createTax.mutateAsync({ countryCode, taxRate })
      toast.success('Tax rate added successfully')
      setCountryCode('')
      setTaxRate('')
    } catch (err) { const e = err as {response?: {data?: {message?: string}}};
      toast.error(e.response?.data?.message || 'Failed to add tax rate')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax rate?')) return
    try {
      await deleteTax.mutateAsync(id)
      toast.success('Tax rate deleted')
    } catch (err) { const e = err as {response?: {data?: {message?: string}}};
      toast.error('Failed to delete tax rate')
    }
  }

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground mr-2" /> Loading...</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Regional Taxes</h1>
          <p className="text-muted-foreground">Manage dynamic tax rates depending on the user's country.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1">
          <form onSubmit={handleCreate} className="bg-card border rounded-xl overflow-hidden">
            <div className="p-4 border-b bg-muted/20">
              <h2 className="font-semibold">Add New Tax Rate</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Country Code (ISO 2)</label>
                <input 
                  type="text"
                  maxLength={2}
                  required
                  placeholder="e.g. US, UK, DE, UA"
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value.toUpperCase())}
                  className="w-full text-foreground bg-background border p-2 rounded-md uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tax Rate (%)</label>
                <div className="relative">
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 20"
                    value={taxRate}
                    onChange={e => setTaxRate(Number(e.target.value))}
                    className="w-full text-foreground bg-background border p-2 rounded-md pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground font-medium p-2 rounded-md flex justify-center items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16} />}
                Add Rule
              </button>
            </div>
          </form>

          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 p-4 rounded-xl text-sm flex gap-3">
            <ShieldAlert size={20} className="shrink-0" />
            <p>
              If a user's IP country mismatches their billing country, manual checkout will automatically flag them and apply the IP country's tax rate.
            </p>
          </div>
        </div>

        <div className="col-span-2">
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold">Configured Regions</h2>
              <span className="text-sm text-muted-foreground mr-2">{taxes?.length || 0} active</span>
            </div>
            
            {taxes && taxes.length > 0 ? (
              <div className="divide-y relative">
                {taxes.map(tax => (
                  <div key={tax.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                    <div>
                      <h3 className="font-semibold text-lg">{tax.countryCode}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Added {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(tax.createdAt))}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="font-mono text-xl tracking-tight bg-primary/10 text-primary px-3 py-1 rounded-md">
                        {(Number(tax.taxRate) * 100).toFixed(2)}%
                      </span>
                      <button 
                        onClick={() => handleDelete(tax.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                No custom tax rates defined. Standard platform rates or Stripe taxes will apply.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
