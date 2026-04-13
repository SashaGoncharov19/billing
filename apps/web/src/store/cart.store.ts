import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  name: string
  price: string // Base price without tax/currency mapping yet
  setupFee?: string
  currency: string
  billingType: string
  quantity: number
}

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        set((state) => {
          const existing = state.items.find(i => i.productId === item.productId)
          if (existing) {
            return {
              items: state.items.map(i => 
                i.productId === item.productId 
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              )
            }
          }
          return { items: [...state.items, item] }
        })
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(i => i.productId !== productId)
        }))
      },
      updateQuantity: (productId, quantity) => {
        if (quantity < 1) return
        set((state) => ({
          items: state.items.map(i => 
            i.productId === productId ? { ...i, quantity } : i
          )
        }))
      },
      clearCart: () => set({ items: [] }),
      getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0)
    }),
    {
      name: 'entityseven-cart',
    }
  )
)
