import { useState } from 'react'
import { useAdminCurrencies, useAdminCreateCurrency, useAdminUpdateCurrency, useAdminDeleteCurrency } from '@/lib/api-admin'
import type { Currency } from '@/lib/api-admin'
import { useAuthStore } from '@/store/auth.store'
import { Plus, Loader2, Edit, Trash2, Globe } from 'lucide-react'

export default function AdminCurrencies() {
  const { data: currencies, isLoading } = useAdminCurrencies()
  const createCurrency = useAdminCreateCurrency()
  const updateCurrency = useAdminUpdateCurrency()
  const deleteCurrency = useAdminDeleteCurrency()
  const { tenant } = useAuthStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    symbol: '',
    exchangeRate: '1.000000',
    isBaseCurrency: false,
    isActive: true
  })

  const openNewModal = () => {
    setEditingId(null)
    setFormData({ code: '', symbol: '', exchangeRate: '1.000000', isBaseCurrency: false, isActive: true })
    setIsModalOpen(true)
  }

  const handleEdit = (c: Currency) => {
    setEditingId(c.id)
    setFormData({ code: c.code, symbol: c.symbol, exchangeRate: String(c.exchangeRate), isBaseCurrency: c.isBaseCurrency, isActive: c.isActive })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant) return

    const payload = { ...formData, tenantId: tenant.id }

    if (editingId) {
      await updateCurrency.mutateAsync({ id: editingId, payload })
    } else {
      await createCurrency.mutateAsync(payload)
    }

    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Currencies</h1>
          <p className="text-muted-foreground">Manage accepted currencies and exchange rates.</p>
        </div>
        <button onClick={openNewModal} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 flex items-center gap-2">
          <Plus size={18} /> Add Currency
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin mr-2" /> Loading...</div>
        ) : currencies?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Globe size={48} className="mx-auto mb-4 opacity-50" />
            <p>No currencies configured.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Currency</th>
                <th className="px-6 py-4">Rate vs Base</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currencies?.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium flex items-center gap-2">
                    <span className="bg-muted px-2 py-1 flex rounded font-mono text-xs">{c.symbol}</span>
                    {c.code}
                    {c.isBaseCurrency && <span className="text-[10px] uppercase font-bold text-primary ml-2 bg-primary/10 px-2 py-0.5 rounded">Base</span>}
                  </td>
                  <td className="px-6 py-4">{Number(c.exchangeRate).toFixed(3)}</td>
                  <td className="px-6 py-4">{c.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(c)} className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground mr-2"><Edit size={16} /></button>
                    {!c.isBaseCurrency && (
                      <button onClick={() => deleteCurrency.mutateAsync(c.id)} className="p-2 hover:bg-red-500/20 text-red-500 rounded-md"><Trash2 size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-xl border shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center"><h2 className="text-lg font-semibold">{editingId ? 'Edit Currency' : 'Add Currency'}</h2><button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">&times;</button></div>
            <div className="p-6 overflow-y-auto">
              <form id="currency-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-sm font-medium">Currency Code</label><input required value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="USD" className="w-full p-2 border rounded-md bg-background uppercase" /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">Symbol</label><input required value={formData.symbol} onChange={e => setFormData(p => ({ ...p, symbol: e.target.value }))} placeholder="$" className="w-full p-2 border rounded-md bg-background" /></div>
                </div>
                <div className="space-y-2"><label className="text-sm font-medium">Exchange Rate to Base</label><input required type="number" step="0.000001" value={formData.exchangeRate} onChange={e => setFormData(p => ({ ...p, exchangeRate: e.target.value }))} className="w-full p-2 border rounded-md bg-background" /></div>
                <div className="flex items-center gap-2"><input type="checkbox" id="isBase" checked={formData.isBaseCurrency} onChange={e => setFormData(p => ({ ...p, isBaseCurrency: e.target.checked }))} /><label htmlFor="isBase" className="text-sm">Set as Base Currency (1.00 rate)</label></div>
                <div className="flex items-center gap-2"><input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))} /><label htmlFor="isActive" className="text-sm">Active</label></div>
              </form>
            </div>
            <div className="p-6 border-t flex justify-end gap-3"><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-muted rounded-lg font-medium">Cancel</button><button type="submit" form="currency-form" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium">{editingId ? 'Save' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
