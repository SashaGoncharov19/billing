import { useState } from 'react'
import {
  useAdminProducts,
  useAdminPlugins,
  useAdminPluginOptions,
  useAdminCreateProduct,
  useAdminUpdateProduct,
  useAdminDeleteProduct,
  useAdminCurrencies
} from '@/lib/api-admin'
import type { Product, Currency } from '@/lib/api-admin'
import { useAuthStore } from '@/store/auth.store'
import { Plus, Package, Plug, Loader2, Edit, Trash2 } from 'lucide-react'

export default function AdminProducts() {
  const { data: products, isLoading: loadingProducts } = useAdminProducts()
  const { data: plugins } = useAdminPlugins()
  const createProduct = useAdminCreateProduct()
  const updateProduct = useAdminUpdateProduct()
  const deleteProduct = useAdminDeleteProduct()
  
  const { tenant } = useAuthStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    setupFee: '',
    currency: 'usd',
    billingType: 'one_time',
    billingInterval: 'month',
    pluginType: '',
    pluginConfigTemplateId: ''
  })
  
  const { data: currencies } = useAdminCurrencies()

  const handleEdit = (product: Product) => {
    setEditingId(product.id)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      currency: product.currency || 'usd',
      setupFee: product.setupFee ? product.setupFee.toString() : '',
      billingType: product.billingType,
      billingInterval: product.billingInterval || 'month',
      pluginType: product.pluginType || '',
      pluginConfigTemplateId: product.pluginConfig?.hostingPlanId || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (productId: string) => {
    if (!tenant) return
    if (confirm('Are you sure you want to delete this product? All existing subscriptions will remain, but new users won\'t be able to buy it.')) {
      await deleteProduct.mutateAsync({ id: productId, tenantId: tenant.id })
    }
  }

  const openNewModal = () => {
    setEditingId(null)
    setFormData({
      name: '', description: '', price: '', setupFee: '', currency: 'usd', billingType: 'one_time', billingInterval: 'month', pluginType: '', pluginConfigTemplateId: ''
    })
    setIsModalOpen(true)
  }

  const { data: pluginOptions, isLoading: loadingOptions } = useAdminPluginOptions(
    formData.pluginType !== '' ? formData.pluginType : undefined
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!tenant) return

    const payload: Record<string, unknown> = {
      tenantId: tenant.id,
      name: formData.name,
      setupFee: formData.setupFee || undefined,
      description: formData.description,
    }

    if (formData.pluginType) {
      payload.pluginType = formData.pluginType
      payload.pluginConfig = {
        hostingPlanId: formData.pluginConfigTemplateId
      }
    }

    if (editingId) {
      await updateProduct.mutateAsync({ id: editingId, tenantId: tenant.id, payload })
    } else {
      payload.price = parseFloat(formData.price)
      payload.currency = formData.currency
      payload.billingType = formData.billingType
      if (formData.billingType === 'recurring') {
        payload.billingInterval = formData.billingInterval
      }
      await createProduct.mutateAsync(payload)
    }

    setIsModalOpen(false)
    setEditingId(null)
    setFormData({
      name: '', description: '', price: '', setupFee: '', currency: 'usd', billingType: 'one_time', billingInterval: 'month', pluginType: '', pluginConfigTemplateId: ''
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
          onClick={openNewModal}
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
                <th className="px-6 py-4 font-medium">Setup Fee</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Plugin</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
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
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button onClick={() => handleEdit(p)} className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors mr-2">
                       <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-500/20 text-red-500 rounded-md transition-colors">
                       <Trash2 size={16} />
                    </button>
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
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Product' : 'Create New Product'}</h2>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Setup Fee (One-time)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.setupFee}
                    onChange={(e) => setFormData(p => ({ ...p, setupFee: e.target.value }))}
                    className="w-full p-2 rounded-md border bg-background"
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price</label>
                    <div className="flex gap-2">
                      <input
                        required
                        disabled={!!editingId}
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))}
                        className="w-full p-2 rounded-md border bg-background disabled:opacity-50"
                        placeholder="0.00"
                      />
                      <select
                        disabled={!!editingId} // Can't change currency after creation
                        value={formData.currency}
                        onChange={(e) => setFormData(p => ({ ...p, currency: e.target.value }))}
                        className="w-24 p-2 rounded-md border bg-background disabled:opacity-50 uppercase"
                      >
                         {currencies?.map((c: Currency) => (
                            <option key={c.code} value={c.code.toLowerCase()}>{c.code.toUpperCase()}</option>
                         ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Billing Type</label>
                    <select
                      disabled={!!editingId} // Disable if editing
                      value={formData.billingType}
                      onChange={(e) => setFormData(p => ({ ...p, billingType: e.target.value }))}
                      className="w-full p-2 rounded-md border bg-background disabled:opacity-50"
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
                      disabled={!!editingId} // Disable if editing
                      value={formData.billingInterval}
                      onChange={(e) => setFormData(p => ({ ...p, billingInterval: e.target.value }))}
                      className="w-full p-2 rounded-md border bg-background disabled:opacity-50"
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
                        {pluginOptions?.map((opt: { id: string | number; name: string }) => (
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
                disabled={createProduct.isPending || updateProduct.isPending}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center"
              >
                {(createProduct.isPending || updateProduct.isPending) ? <><Loader2 size={16} className="animate-spin mr-2" /> Saving...</> : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
