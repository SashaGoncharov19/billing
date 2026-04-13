import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    // Redirect to login but save the attempted location
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  if (requireAdmin && user?.role !== 'admin' && user?.role !== 'owner') {
    // Not authorized for admin routes
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
