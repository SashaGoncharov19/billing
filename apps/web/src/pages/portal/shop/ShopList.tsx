import { useStoreProducts } from '@/lib/api-store'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Package, Loader2 } from 'lucide-react'

export default function ShopList() {
  const { data: products, isLoading } = useStoreProducts()

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Services & Subscriptions</h1>
        <p className="text-muted-foreground mt-2">Discover premium hosting, integrations, and expansions for your workspace.</p>
      </motion.div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
          <Loader2 className="animate-spin mb-4" size={32} />
          Loading the storefront...
        </div>
      ) : products?.length === 0 ? (
        <div className="p-20 text-center text-muted-foreground border rounded-2xl bg-card">
          <Package className="mx-auto opacity-20 mb-4" size={64} />
          <p className="text-lg">No active products available right now.</p>
        </div>
      ) : (
        <motion.div 
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
        >
          {products?.map(product => (
            <motion.div
              key={product.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 }
              }}
              className="group rounded-2xl border bg-card hover:border-primary/50 hover:shadow-lg transition-all overflow-hidden flex flex-col"
            >
              <div className="h-3 bg-gradient-to-r from-indigo-500 to-purple-600 w-full" />
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">{product.name}</h3>
                </div>
                
                <p className="text-muted-foreground text-sm flex-1 mb-6">
                  {product.description || "Premium integration providing automated provisioning and scale."}
                </p>

                <div className="border-t border-border/50 pt-4 mt-auto">
                  <div className="flex items-end gap-1 mb-4">
                    <span className="text-3xl font-extrabold tracking-tight">${Number(product.price).toFixed(2)}</span>
                    <span className="text-muted-foreground font-medium mb-1 uppercase text-xs">
                       {product.currency} {product.billingType === 'recurring' ? `/ ${product.billingInterval}` : ''}
                    </span>
                  </div>

                  <Link 
                    to={`/shop/${product.id}`}
                    className="flex justify-center items-center w-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground py-2.5 rounded-lg font-medium transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
