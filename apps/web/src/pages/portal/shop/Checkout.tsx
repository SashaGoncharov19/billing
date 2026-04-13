import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStoreProduct, useStorePaymentMethods, useStoreCurrencies, useCheckoutMutation } from '@/lib/api-store'
import { CreditCard, Loader2, Lock, Receipt, ChevronRight } from 'lucide-react'

export default function Checkout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: product, isLoading: loadingProduct } = useStoreProduct(id || '')
  const { data: paymentMethods, isLoading: loadingMethods } = useStorePaymentMethods()
  const { data: currencies } = useStoreCurrencies()
  const checkoutMutation = useCheckoutMutation()
  
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>('')

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

  // Calculate dynamic price based on exchange rate
  const displayPrice = () => {
    if (!product || !activeCurrency) return 0
    const basePrice = Number(product.price)
    return (basePrice * Number(activeCurrency.exchangeRate)).toFixed(2)
  }

  const handlePay = async () => {
    if (!product) return

    const chosenPm = paymentMethods?.find(pm => pm.identifier === selectedMethod)

    if (chosenPm?.type === 'gateway' && selectedMethod === 'stripe') {
      try {
        const { url } = await checkoutMutation.mutateAsync({
          productId: product.id,
          paymentMethod: selectedMethod,
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/shop/${product.id}?checkout=canceled`
        })
        window.location.href = url
      } catch (e) {
        console.error('Checkout failed', e)
      }
    } else if (chosenPm?.type === 'manual') {
       // Manual invoice creation
       try {
         const res = await fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/billing/manual-checkout`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
           body: JSON.stringify({ productId: product.id, paymentMethodId: chosenPm.id, currencyId: selectedCurrencyId })
         })
         const data = await res.json()
         if (data.invoiceId) {
            navigate('/dashboard?checkout=manual_pending')
         }
       } catch(e) {
         console.error('Manual checkout failed', e)
       }
    } else {
      alert(`The ${selectedMethod} gateway is coming soon!`)
    }
  }

  if (loadingProduct) return <div className="p-20 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading checkout...</div>

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <button onClick={() => navigate('/shop')} className="hover:text-foreground transition-colors">Store</button>
        <ChevronRight size={14} />
        <button onClick={() => navigate(`/shop/${id}`)} className="hover:text-foreground transition-colors">{product?.name}</button>
        <ChevronRight size={14} />
        <span className="font-medium text-foreground">Secure Checkout</span>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Left Column - Payment Selection */}
        <div className="md:col-span-3 space-y-6">
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

        {/* Right Column - Summary */}
        <div className="md:col-span-2">
          <div className="bg-card border rounded-2xl p-6 sticky top-24 shadow-sm">
            <h3 className="font-semibold text-lg border-b pb-4 mb-4">Order Summary</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{product?.name}</div>
                  <div className="text-sm text-muted-foreground">{product?.billingType === 'recurring' ? 'Recurring Subscription' : 'One Time Purchase'}</div>
                </div>
                <div className="font-semibold">
                  {activeCurrency?.symbol}{displayPrice()}
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mb-8">
              <div className="flex justify-between items-end">
                <span className="font-semibold text-lg">Total</span>
                <span className="text-3xl font-bold tracking-tight">
                   {activeCurrency?.symbol}{displayPrice()}
                   <span className="text-sm text-muted-foreground font-medium ml-1">{activeCurrency?.code}</span>
                </span>
              </div>
            </div>

            {currencies && currencies.length > 1 && (
               <div className="mb-6">
                 <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase">Currency</label>
                 <select 
                   value={selectedCurrencyId} 
                   onChange={e => setSelectedCurrencyId(e.target.value)}
                   className="w-full p-2 bg-muted/50 border rounded-lg text-sm"
                 >
                   {currencies.map(c => (
                     <option key={c.id} value={c.id}>{c.code} ({c.symbol})</option>
                   ))}
                 </select>
               </div>
            )}

            <button
              onClick={handlePay}
              disabled={checkoutMutation.isPending}
              className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {checkoutMutation.isPending ? (
                <><Loader2 className="animate-spin" size={20} /> Processing...</>
              ) : (
                <><Lock size={18} /> Confirm Payment</>
              )}
            </button>
            <p className="text-center text-xs text-muted-foreground mt-4 flex justify-center items-center gap-1">
              <Lock size={10} /> Secure encrypted checkout
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
