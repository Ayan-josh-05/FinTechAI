import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GetCurrentUserResponse } from '@/features/Auth/api'

interface UserProfileStore {
  // User profile data
  userData: GetCurrentUserResponse | null
  // Loading state
  isLoading: boolean
  // Error state
  error: string | null
  // Actions
  setUserData: (data: GetCurrentUserResponse) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearUserData: () => void
  // Computed values
  hasUserData: () => boolean
}

export const useUserProfileStore = create<UserProfileStore>()(
  persist(
    (set, get) => ({
      // Initial state
      userData: null,
      isLoading: false,
      error: null,

      // Actions
      setUserData: (data: GetCurrentUserResponse) => {
        set({
          userData: data,
          error: null,
        })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      setError: (error: string | null) => {
        set({ error })
      },

      clearUserData: () => {
        set({
          userData: null,
          error: null,
        })
      },

      // Computed values
      hasUserData: () => {
        const state = get()
        return state.userData !== null
      },
    }),
    {
      name: 'user-profile-store',
      // Only persist user data
      partialize: (state) => ({
        userData: state.userData,
      }),
    }
  )
)
