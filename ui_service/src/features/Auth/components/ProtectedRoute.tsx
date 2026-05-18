import { useAuthStore, useIsAuthenticated } from '../store/authStore'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useIsAuthenticated()
  const isLoading = useAuthStore((state) => state.isLoading)

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '16px',
          color: '#666',
        }}
      >
        Loading...
      </div>
    )
  }

  // Don't render anything while not authenticated
  // Axios interceptor will handle redirect to /signin
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

export default ProtectedRoute
