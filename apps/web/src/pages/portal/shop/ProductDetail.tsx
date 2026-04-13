import { useParams, Link, useNavigate } from 'react-router-dom'
import { useStoreProduct } from '@/lib/api-store'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, ShieldCheck, Zap, Loader2, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { toast } from 'sonner'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: product, isLoading } = useStoreProduct(id || '')
  const addToCart = useCartStore(state => state.addItem)

  const handleAddToCart = () => {
    if (!product) return
    addToCart({
      productId: product.id,
      name: product.name,
      price: String(product.price),
      billingType: product.billingType,
      quantity: 1
    })
    toast.success(`${product.name} added to cart`)
    navigate('/shop')
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={24} /> Loading details...
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <h2 className="text-xl font-semibold mb-2">Product Not Found</h2>
        <p>This product may no longer be available.</p>
        <Link to="/shop" className="text-primary hover:underline mt-4 inline-block">Return to Store</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <button 
        onClick={() => navigate('/shop')}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
      >
        <ArrowLeft size={16} className="mr-2" /> Back to Store
      </button>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-4">{product.name}</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {product.description || "Top-tier performance with automated provisioning. Secure, scalable, and fully managed."}
            </p>
          </div>

          <div className="space-y-4 py-4 border-y border-border/50">
            {[
              "Instant Automated Provisioning",
              "Enterprise-Grade DDoS Protection",
              "24/7 Dedicated Support Access",
              "99.9% Uptime SLA Guarantee"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="text-green-500" size={20} />
                <span className="font-medium text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/30 p-4 rounded-xl border border-muted">
            <ShieldCheck size={24} className="text-primary" />
            <p>Your payment is securely processed. You can cancel your subscription at any time.</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border bg-card/50 backdrop-blur-sm p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Zap size={120} />
          </div>
          
          <div className="relative z-10">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">Order Summary</h3>
            <div className="flex items-end gap-2 mb-8">
              <span className="text-5xl font-extrabold tracking-tight">${Number(product.price).toFixed(2)}</span>
              <span className="text-muted-foreground font-medium mb-1 uppercase">
                {product.currency} {product.billingType === 'recurring' ? `/ ${product.billingInterval}` : 'One Time'}
              </span>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between border-b pb-2 text-sm">
                <span className="text-muted-foreground">Setup Fee</span>
                <span className="font-medium">$0.00</span>
              </div>
              <div className="flex justify-between border-b pb-2 text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">Calculated at checkout</span>
              </div>
            </div>

            <button 
              onClick={handleAddToCart}
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] shadow-xl shadow-primary/20 transition-all font-bold text-lg w-full py-4 rounded-xl flex items-center justify-center gap-2"
            >
              Add to Cart <ShoppingCart size={20} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
