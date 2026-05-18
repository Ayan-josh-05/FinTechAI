import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { getCurrentUser } from '../api'

/**
 * Hook to initialize authentication on app boot
 * ALWAYS calls /auth/me unconditionally to validate session with backend
 * This is the ONLY way to determine if user is logged in
 */
export const useAuthInitialization = () => {
  const { setUser, setIsLoading, clearUser } = useAuthStore()

  useEffect(() => {
    const initializeAuth = async () => {
      // Skip auth check on public pages to prevent infinite loops
      const currentPath = window.location.pathname
      if (currentPath === '/signin' || currentPath === '/create-profile') {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        // Call /auth/me to validate session with backend
        // Backend is the sole authority for session validity
        const response = await getCurrentUser(false) // Don't show error toast
        
        // Transform response to User format
        const userData = {
          id: response.id.toString(),
          email: response.email,
          full_name: response.full_name,
          profile_type: JSON.stringify(response.profile),
        }
        
        // Backend validated session - store user in memory
        setUser(userData)
        console.log('Auth initialization successful - user data loaded')
      } catch (error: any) {
        // Backend rejected session (401 or other error)
        console.log('Auth initialization failed - clearing user data:', error.response?.status)
        
        // Clear user data from store when /me API fails
        clearUser()
        
        // For 401 errors, redirect to signin (tokens expired scenario)
        if (error.response?.status === 401) {
          console.log('Session expired - redirecting to signin')
          window.location.href = '/signin'
        }
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, []) // Only on mount
}
