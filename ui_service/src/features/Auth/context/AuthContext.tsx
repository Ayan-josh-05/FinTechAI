import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { logoutUser } from '../api'
import { logoutService } from '../services/logoutService'
import { clearUserDataFromStorage } from '@/utils/logoutUtils'

interface User {
  id: string
  email: string
  full_name: string
  profile_type: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isLoggingOut: boolean
  login: (userData: User, token?: string, refreshToken?: string) => void
  logout: () => void
  logoutWithAPI: (refreshToken: string) => Promise<void>
  checkAuth: () => boolean
  getRefreshToken: () => string | null
  refreshToken: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    setIsLoading(false)
  }, [])

  // Register logout callback with the global logout service
  useEffect(() => {
    logoutService.registerLogoutCallback(logout)

    return () => {
      logoutService.unregisterLogoutCallback()
    }
  }, [])

  const login = (userData: User) => {
    setUser(userData)
    console.log('User logged in:', userData.email)
  }

  const logout = () => {
    setIsLoggingOut(true)
    setUser(null)

    // Clear all TanStack Query cache to prevent data leakage between users
    queryClient.clear()

    // Clear all user-specific data from localStorage
    clearUserDataFromStorage()

    navigate({ to: '/signin' })
  }

  const logoutWithAPI = async (refreshToken: string) => {
    try {
      await logoutUser(refreshToken)
    } catch (error) {
      console.error('Logout API call failed:', error)
      // Continue with local logout even if API call fails
    } finally {
      // Call logout which will clear cache and localStorage
      logout()
    }
  }

  const checkAuth = (): boolean => {
    return !!user
  }

  const getRefreshToken = (): string | null => {
    return null
  }

  const refreshToken = async (): Promise<void> => {
    console.warn('refreshToken() is deprecated - token refresh is handled by backend')
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isLoggingOut,
    login,
    logout,
    logoutWithAPI,
    checkAuth,
    getRefreshToken,
    refreshToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
