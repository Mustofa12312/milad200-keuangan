import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import LoadingScreen from '@/components/ui/LoadingScreen'

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, profile, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading || (user && !profile)) return <LoadingScreen />

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
