import { create } from 'zustand'

interface AppState {
  isLoading: boolean
  setLoading: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  isLoading: false,
  setLoading: (v) => set({ isLoading: v }),
}))
