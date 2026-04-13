import { useState } from 'react'
import { useAdminPaymentMethods, useAdminCreatePaymentMethod, useAdminUpdatePaymentMethod, useAdminDeletePaymentMethod } from '@/lib/api-admin'
import type { PaymentMethod } from '@/lib/api-admin'
import { useAuthStore } from '@/store/auth.store'
import { Plus, CreditCard, Loader2, Edit, Trash2 } from 'lucide-react'

export default function AdminPaymentMethods() {
  const { data: methods, isLoading } = useAdminPaymentMethods()
  const createMethod = useAdminCreatePaymentMethod()
  const updateMethod = useAdminUpdatePaymentMethod()
  const deleteMethod = useAdminDeletePaymentMethod()
  const { tenant } = useAuthStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    identifier: '',
    type: 'gateway',
    instructions: '',
    isActive: true
  })

  const openNewModal = () => {
    setEditingId(null)
    setFormData({ name: '', identifier: '', type: 'gateway', instructions: '', isActive: true })
    setIsModalOpen(true)
  }

  const handleEdit = (m: PaymentMethod) => {
    setEditingId(m.id)
    setFormData({ name: m.name, identifier: m.identifier, type: m.type, instructions: m.instructions || '', isActive: m.isActive })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant) return

    const payload = { ...formData, tenantId: tenant.id }
    
    if (editingId) {
      await updateMethod.mutateAsync({ id: editingId, payload })
    } else {
      await createMethod.mutateAsync(payload)
    }

    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Methods</h1>
          <p className="text-muted-foreground">Manage accepted payment gateways and manual methods.</p>
        </div>
        <button onClick={openNewModal} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 flex items-center gap-2">
          <Plus size={18} /> Add Method
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin mr-2" /> Loading...</div>
        ) : methods?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
            <p>No payment methods configured.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Identifier</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {methods?.map(m => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium">{m.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{m.identifier}</td>
                  <td className="px-6 py-4 capitalize">{m.type}</td>
                  <td className="px-6 py-4">{m.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(m)} className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground mr-2"><Edit size={16} /></button>
                    <button onClick={() => deleteMethod.mutateAsync(m.id)} className="p-2 hover:bg-red-500/20 text-red-500 rounded-md"><Trash2 size={16} /></button>
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
            <div className="p-6 border-b flex justify-between items-center"><h2 className="text-lg font-semibold">{editingId ? 'Edit Method' : 'Add Payment Method'}</h2><button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">&times;</button></div>
            <div className="p-6 overflow-y-auto">
              <form id="pm-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><label className="text-sm font-medium">Display Name</label><input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="e.g. Cash Transfer" className="w-full p-2 border rounded-md bg-background"/></div>
                <div className="space-y-2"><label className="text-sm font-medium">System Identifier</label><input required value={formData.identifier} onChange={e => setFormData(p => ({...p, identifier: e.target.value}))} placeholder="cash" className="w-full p-2 border rounded-md bg-background"/></div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <select value={formData.type} onChange={e => setFormData(p => ({...p, type: e.target.value}))} className="w-full p-2 border rounded-md bg-background">
                    <option value="gateway">Automated Gateway (e.g. Stripe)</option>
                    <option value="manual">Manual (e.g. Cash, Wire Transfer)</option>
                  </select>
                </div>
                {formData.type === 'manual' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Instructions (shown to user)</label>
                    <textarea value={formData.instructions} onChange={e => setFormData(p => ({...p, instructions: e.target.value}))} className="w-full p-2 border rounded-md bg-background" rows={3}></textarea>
                  </div>
                )}
                <div className="flex items-center gap-2"><input type="checkbox" id="isActivePm" checked={formData.isActive} onChange={e => setFormData(p => ({...p, isActive: e.target.checked}))} /><label htmlFor="isActivePm" className="text-sm">Active</label></div>
              </form>
            </div>
            <div className="p-6 border-t flex justify-end gap-3"><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-muted rounded-lg font-medium">Cancel</button><button type="submit" form="pm-form" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium">{editingId ? 'Save' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
