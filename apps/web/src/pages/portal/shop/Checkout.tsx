import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStorePaymentMethods, useStoreCurrencies, useCheckoutMutation, useManualCheckoutMutation } from '@/lib/api-store'
import { useCartStore } from '@/store/cart.store'
import { CreditCard, Loader2, Lock, Receipt, ChevronRight, PackageX } from 'lucide-react'

export default function Checkout() {
  const navigate = useNavigate()
  
  const { items, removeItem, clearCart } = useCartStore()
  
  const { data: paymentMethods, isLoading: loadingMethods } = useStorePaymentMethods()
  const { data: currencies } = useStoreCurrencies()
  const checkoutMutation = useCheckoutMutation()
  const manualCheckoutMutation = useManualCheckoutMutation()
  
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>('')
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Auto-select first available method and base currency
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(paymentMethods[0].identifier)
    }
  }, [paymentMethods])

  useEffect(() => {
    if (currencies && currencies.length > 0 && !selectedCurrencyId) {
      const baseCurr = currencies.find(c => c.isBaseCurrency)
      setSelectedCurrencyId(baseCurr ? baseCurr.id : currencies[0].id)
    }
  }, [currencies])

  const activeCurrency = currencies?.find(c => c.id === selectedCurrencyId)



  const formatCurrency = (amount: number) => {
    if (!activeCurrency) return `$${amount.toFixed(2)}`
    return new Intl.NumberFormat('en-US', {
       style: 'currency',
       currency: activeCurrency.code
    }).format(amount * Number(activeCurrency.exchangeRate))
  }

  const subtotalBase = items.reduce((total, item) => total + (Number(item.price) * item.quantity), 0)
  const setupFeeBase = items.reduce((total, item) => total + (item.setupFee ? Number(item.setupFee) * item.quantity : 0), 0)
  const totalBase = subtotalBase + setupFeeBase
  
  const displaySubtotal = () => formatCurrency(totalBase)

  const handlePay = async () => {
    if (items.length === 0) return
    setCheckoutError(null)

    const chosenPm = paymentMethods?.find(pm => pm.identifier === selectedMethod)
    
    // Map abstract CartItem array to API payload
    const checkoutItems = items.map(i => ({ productId: i.productId, quantity: i.quantity }))

    if (chosenPm?.type === 'gateway' && selectedMethod === 'stripe') {
      try {
        const response = await checkoutMutation.mutateAsync({
          items: checkoutItems,
          paymentMethod: selectedMethod,
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/checkout?checkout=canceled`
        })
        
        if (response.error === 'COUNTRY_MISMATCH') {
            setCheckoutError(response.message || 'Country mismatch error')
            return
        }
        
        if (response.url) {
            clearCart() // empty cart if we successfully leave to Stripe
            window.location.href = response.url
        }
      } catch (err) { const e = err as {response?: {data?: {message?: string}}};
        if (e.response?.data?.error === 'COUNTRY_MISMATCH') {
            setCheckoutError(e.response.data.message)
        } else {
            setCheckoutError('Checkout failed due to a server error.')
        }
        console.error('Checkout failed', e)
      }
    } else if (chosenPm?.type === 'manual') {
       try {
         const data = await manualCheckoutMutation.mutateAsync({ 
           items: checkoutItems, 
           paymentMethodId: chosenPm.id, 
           currencyId: selectedCurrencyId 
         })
         if (data.error === 'COUNTRY_MISMATCH') {
            setCheckoutError(data.message)
            return
         }
         
         if (data.invoiceId) {
            clearCart()
            navigate('/dashboard?checkout=manual_pending')
         }
       } catch (err) { const e = err as {response?: {data?: {message?: string}}};
         if (e.response?.data?.error === 'COUNTRY_MISMATCH') {
            setCheckoutError(e.response.data.message)
         } else {
            setCheckoutError('Manual checkout failed.')
         }
         console.error('Manual checkout failed', e)
       }
    } else {
      alert(`The ${selectedMethod} gateway is coming soon!`)
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <PackageX size={64} className="mx-auto mb-6 opacity-20" />
        <h2 className="text-2xl font-bold tracking-tight mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-8">You haven't added any premium integrations or servers yet.</p>
        <button onClick={() => navigate('/shop')} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90">
          Browse the Store
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <button onClick={() => navigate('/shop')} className="hover:text-foreground transition-colors">Store</button>
        <ChevronRight size={14} />
        <span className="font-medium text-foreground">Secure Checkout</span>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        {checkoutError && (
          <div className="md:col-span-5 bg-red-500/10 border border-red-500/50 text-red-600 p-4 rounded-xl flex items-center gap-3">
            <Lock size={20} className="shrink-0" />
            <p className="font-medium">{checkoutError}</p>
          </div>
        )}

        {/* Left Column - Payment Selection & Cart Items */}
        <div className="md:col-span-3 space-y-8">
          
          <div className="bg-card border rounded-2xl p-6">
             <h2 className="text-xl font-bold tracking-tight mb-4 border-b pb-4">Cart Items ({items.length})</h2>
             <div className="space-y-4">
                {items.map(item => (
                  <div key={item.productId} className="flex justify-between items-center group">
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.name}</div>
                      <div className="text-xs text-muted-foreground">Qty: {item.quantity} | {item.billingType === 'recurring' ? 'Recurring' : 'One Time'}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-medium text-sm flex flex-col items-end gap-1">
                        <span>{formatCurrency(Number(item.price) * item.quantity)}</span>
                        {item.setupFee && Number(item.setupFee) > 0 && (
                          <span className="text-xs text-primary">+ {formatCurrency(Number(item.setupFee) * item.quantity)} setup</span>
                        )}
                      </div>
                      <button 
                         onClick={() => removeItem(item.productId)}
                         className="text-xs text-muted-foreground hover:text-destructive underline"
                      >
                         Remove
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Select Payment Method</h2>
            <div className="grid gap-4">
              {loadingMethods ? (
                <div className="p-4 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading payment methods...</div>
              ) : paymentMethods?.length === 0 ? (
                <div className="p-4 border rounded-xl text-muted-foreground text-center">No payment methods available.</div>
              ) : paymentMethods?.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setSelectedMethod(pm.identifier)}
                  className={`p-6 border-2 rounded-2xl flex items-center gap-4 text-left transition-all ${
                    selectedMethod === pm.identifier 
                      ? 'border-primary bg-primary/5 ring-4 ring-primary/10' 
                      : 'bg-card hover:border-primary/50'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${selectedMethod === pm.identifier ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {pm.type === 'gateway' ? <CreditCard size={24} /> : <Receipt size={24} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{pm.name}</h3>
                    <p className="text-muted-foreground text-sm">
                      {pm.type === 'gateway' ? 'Automated Payment' : 'Manual Payment Processing'}
                    </p>
                    {pm.type === 'manual' && selectedMethod === pm.identifier && pm.instructions && (
                       <div className="mt-3 p-3 bg-muted rounded-lg text-sm text-foreground">
                         <strong>Instructions:</strong>
                         <p className="whitespace-pre-wrap">{pm.instructions}</p>
                       </div>
                    )}
                  </div>
                  <div className="ml-auto w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                    {selectedMethod === pm.identifier && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="md:col-span-2">
          <div className="bg-card border rounded-2xl p-6 sticky top-24 shadow-sm">
            <h3 className="font-semibold text-lg border-b pb-4 mb-4">Total Summary</h3>
            
            {currencies && currencies.length > 0 && (
              <div className="mb-6">
                <label className="text-sm font-medium text-muted-foreground block mb-2">Display Currency</label>
                <select
                  value={selectedCurrencyId}
                  onChange={(e) => setSelectedCurrencyId(e.target.value)}
                  className="w-full text-foreground bg-background border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                >
                  {currencies.filter(c => c.isActive).map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.symbol}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-4 mb-8">
              <div className="flex justify-between border-b pb-2 text-sm">
                <span className="text-muted-foreground">Setup Fee</span>
                <span className="font-medium">{formatCurrency(setupFeeBase)}</span>
              </div>
              <div className="flex justify-between border-b pb-2 text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">Calculated at checkout</span>
              </div>
            </div>

            <div className="border-t pt-4 mb-8">
              <div className="flex justify-between items-end">
                <span className="font-semibold text-lg">Total</span>
                <span className="text-3xl font-bold tracking-tight">
                   {displaySubtotal()}
                   <span className="text-sm text-muted-foreground font-medium ml-1">{activeCurrency?.code}</span>
                </span>
              </div>
            </div>

            <button 
              onClick={handlePay}
              disabled={checkoutMutation.isPending || manualCheckoutMutation.isPending || !selectedMethod}
              className="bg-primary text-primary-foreground font-bold hover:scale-[1.02] shadow-xl shadow-primary/20 hover:shadow-primary/30 py-4 rounded-xl flex justify-center items-center gap-2 transition-all w-full disabled:opacity-50 disabled:hover:scale-100"
            >
              {checkoutMutation.isPending || manualCheckoutMutation.isPending ? (
                <><Loader2 className="animate-spin" size={20} /> Processing...</>
              ) : (
                <>
                  <Lock size={18} /> Place Order - {displaySubtotal()}
                </>
              )}
            </button>
            <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
              <Lock size={10} /> Fully encrypted and secured
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
