import { useState } from 'react'
import {
  useAdminProducts,
  useAdminPlugins,
  useAdminPluginOptions,
  useAdminCreateProduct
} from '@/lib/api-admin'
import { useAuthStore } from '@/store/auth.store'
import { Plus, Package, Plug, Loader2 } from 'lucide-react'

export default function AdminProducts() {
  const { data: products, isLoading: loadingProducts } = useAdminProducts()
  const { data: plugins } = useAdminPlugins()
  const createProduct = useAdminCreateProduct()
  
  const { tenant } = useAuthStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    billingType: 'one_time',
    billingInterval: 'month',
    pluginType: '',
    pluginConfigTemplateId: ''
  })

  const { data: pluginOptions, isLoading: loadingOptions } = useAdminPluginOptions(
    formData.pluginType !== '' ? formData.pluginType : undefined
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!tenant) return

    const payload: any = {
      tenantId: tenant.id,
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      currency: 'usd',
      billingType: formData.billingType,
    }

    if (formData.billingType === 'recurring') {
      payload.billingInterval = formData.billingInterval
    }

    if (formData.pluginType) {
      payload.pluginType = formData.pluginType
      payload.pluginConfig = {
        hostingPlanId: formData.pluginConfigTemplateId
      }
    }

    await createProduct.mutateAsync(payload)
    setIsModalOpen(false)
    setFormData({
      name: '', description: '', price: '', billingType: 'one_time', billingInterval: 'month', pluginType: '', pluginConfigTemplateId: ''
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage billing products and integrations</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus size={18} />
          New Product
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {loadingProducts ? (
          <div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin inline mr-2" /> Loading products...</div>
        ) : products?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Package size={48} className="mx-auto mb-4 opacity-50" />
            <p>No products found. Create your first product to start billing.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Plugin</th>
                <th className="px-6 py-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-medium">
                    {p.name}
                    {p.description && <p className="text-xs text-muted-foreground font-normal truncate max-w-xs">{p.description}</p>}
                  </td>
                  <td className="px-6 py-4">
                    ${Number(p.price).toFixed(2)} {p.currency?.toUpperCase()}
                  </td>
                  <td className="px-6 py-4 capitalize">
                    {p.billingType.replace('_', ' ')} {p.billingType === 'recurring' ? `(${p.billingInterval})` : ''}
                  </td>
                  <td className="px-6 py-4">
                    {p.pluginType ? (
                       <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                         <Plug size={12} /> {p.pluginType}
                       </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleDateString()}
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
            <div className="p-6 border-b flex justify-between items-center shrink-0">
              <h2 className="text-lg font-semibold">Create New Product</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full p-2 rounded-md border bg-background"
                    placeholder="e.g. Basic Hosting"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                    className="w-full p-2 rounded-md border bg-background"
                    placeholder="Short description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price (USD)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))}
                      className="w-full p-2 rounded-md border bg-background"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Billing Type</label>
                    <select
                      value={formData.billingType}
                      onChange={(e) => setFormData(p => ({ ...p, billingType: e.target.value }))}
                      className="w-full p-2 rounded-md border bg-background"
                    >
                      <option value="one_time">One Time</option>
                      <option value="recurring">Recurring</option>
                    </select>
                  </div>
                </div>

                {formData.billingType === 'recurring' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Billing Interval</label>
                    <select
                      value={formData.billingInterval}
                      onChange={(e) => setFormData(p => ({ ...p, billingInterval: e.target.value }))}
                      className="w-full p-2 rounded-md border bg-background"
                    >
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                    </select>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-4">INTEGRATIONS</h3>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Provisioning Plugin</label>
                    <select
                      value={formData.pluginType}
                      onChange={(e) => setFormData(p => ({ ...p, pluginType: e.target.value, pluginConfigTemplateId: '' }))}
                      className="w-full p-2 rounded-md border bg-background"
                    >
                      <option value="">None (Standard Billing)</option>
                      {plugins?.map(plugin => (
                        <option key={plugin.id} value={plugin.id}>{plugin.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">Select a plugin to automatically provision resources when a customer purchases this product.</p>
                  </div>

                  {formData.pluginType && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Configuration Template</label>
                      <select
                        required
                        disabled={loadingOptions}
                        value={formData.pluginConfigTemplateId}
                        onChange={(e) => setFormData(p => ({ ...p, pluginConfigTemplateId: e.target.value }))}
                        className="w-full p-2 rounded-md border bg-background disabled:opacity-50"
                      >
                        <option value="">-- Select Template --</option>
                        {pluginOptions?.map((opt: any) => (
                          <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                      </select>
                      {loadingOptions && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Fetching templates from provider...</p>}
                    </div>
                  )}
                </div>

              </form>
            </div>
            
            <div className="p-6 border-t shrink-0 flex justify-end gap-3 bg-muted/20">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="product-form"
                disabled={createProduct.isPending}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center"
              >
                {createProduct.isPending ? <><Loader2 size={16} className="animate-spin mr-2" /> Creating...</> : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
