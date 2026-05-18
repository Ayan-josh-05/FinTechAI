import { create } from 'zustand'

interface User {
  id: string
  email: string
  full_name: string
  profile_type: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setIsLoading: (loading: boolean) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  clearUser: () => set({ user: null }),
}))

// Derived selector for authentication status
export const useIsAuthenticated = () => useAuthStore((state) => !!state.user)
