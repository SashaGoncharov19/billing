import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  setAuth: (token: string, user: User, tenant: Tenant | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      tenant: null,
      isAuthenticated: false,
      setAuth: (accessToken, user, tenant) =>
        set({ accessToken, user, tenant, isAuthenticated: true }),
      clearAuth: () =>
        set({ accessToken: null, user: null, tenant: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
)
