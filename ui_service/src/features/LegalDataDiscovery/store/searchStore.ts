import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FilterState, SearchFormState } from '../types'

interface SearchStore {
  // Search form state
  searchFormState: SearchFormState | null
  // Filter state
  filterState: FilterState | null
  // Search metadata
  lastSearchTimestamp: number | null
  searchIdfKey: string | null
  // Search flow control
  isSearchInitiated: boolean
  // Actions
  setSearchFormState: (state: SearchFormState) => void
  setFilterState: (state: FilterState) => void
  setSearchMetadata: (searchId: string, timestamp: number) => void
  setSearchInitiated: (initiated: boolean) => void
  clearSearchState: () => void
  // Computed values
  hasValidSearchState: () => boolean
}

// Note: These default states are defined but not used in the current implementation
// They can be used in the future if needed for form initialization

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      // Initial state
      searchFormState: null,
      filterState: null,
      lastSearchTimestamp: null,
      searchIdfKey: null,
      isSearchInitiated: false,

      // Actions
      setSearchFormState: (state: SearchFormState) => {
        const currentState = get().searchFormState
        const isNewState = JSON.stringify(currentState) !== JSON.stringify(state)

        if (isNewState) {
          // Only update timestamp if this is a search action, not form population
          const timestamp = get().isSearchInitiated ? Date.now() : get().lastSearchTimestamp
          set({
            searchFormState: state,
            lastSearchTimestamp: timestamp
          })
        }
      },

      setFilterState: (state: FilterState) => {
        set({
          filterState: state,
          lastSearchTimestamp: Date.now()
        })
      },

      setSearchMetadata: (searchId: string, timestamp: number) => {
        set({
          searchIdfKey: searchId,
          lastSearchTimestamp: timestamp
        })
      },

      setSearchInitiated: (initiated: boolean) => {
        set({ isSearchInitiated: initiated })
      },

      clearSearchState: () => {
        // Reset to initial state with first tab as default
        set({
          searchFormState: {
            activeTab: 'PAN No.', // First tab is always PAN No.
            caseType: ''
          },
          filterState: null,
          lastSearchTimestamp: null,
          searchIdfKey: null,
          isSearchInitiated: false,
        })
      },

      // Computed values
      hasValidSearchState: () => {
        const state = get()
        if (!state.searchFormState || !state.lastSearchTimestamp) {
          return false
        }

        // Check if the search state is still valid (within last 30 minutes)
        const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000)
        return state.lastSearchTimestamp > thirtyMinutesAgo
      },
    }),
    {
      name: 'legal-discovery-search-store',
      version: 1, // Increment this to force migration when tab names change
      // Only persist these fields
      partialize: (state) => ({
        searchFormState: state.searchFormState,
        filterState: state.filterState,
        lastSearchTimestamp: state.lastSearchTimestamp,
        searchIdfKey: state.searchIdfKey,
        // Don't persist isSearchInitiated - it should always be false on page load
      }),
      onRehydrateStorage: () => (state) => {
        // Always reset isSearchInitiated and set default form state when store is rehydrated
        if (state) {
          state.isSearchInitiated = false
          state.searchFormState = {
            activeTab: 'PAN No.', // First tab is always PAN No.
            caseType: ''
          }
        }
        return state
      },
    }
  )
)
