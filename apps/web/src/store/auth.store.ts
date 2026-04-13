import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  role?: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  primaryColor?: string | null
  secondaryColor?: string | null
  logoUrl?: string | null
}

interface AuthState {
  accessToken: string | null
  user: User | null
  tenant: Tenant | null
  isAuthenticated: boolean
  
  setAuth: (token: string, user: User, tenant?: Tenant | null) => void
  setToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      tenant: null,
      isAuthenticated: false,
      
      setAuth: (token, user, tenant) => set({ 
        accessToken: token, 
        user, 
        tenant: tenant || null, 
        isAuthenticated: true 
      }),
      
      setToken: (token) => set({ accessToken: token, isAuthenticated: true }),
      
      logout: () => set({ 
        accessToken: null, 
        user: null, 
        tenant: null, 
        isAuthenticated: false 
      })
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        accessToken: state.accessToken,
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated
      }) // Save these fields to persist authentication
    }
  )
)
