import { useCallback, useEffect, useOptimistic, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Sentry from '@sentry/tanstackstart-react'

import { getSearchResultsById, searchLegalData } from '../api'
import { transformAPIFiltersToFilterState, transformAPIResponseToFormData, transformFilters, transformFormDataToFields } from '../utils/helpers'
import { TAB_API_MAPPING } from '../constants'
import { useSearchStore } from '../store'
import type {
  FilterState,
  LegalDiscoverySearchRequest,
  SearchFormState,
} from '../types'
import { updateQueryBookmark } from '@/features/QueryManagement/api'
import { buildSearchParamsFromCurrent, buildSearchParamsObject } from '@/utils/urlParams'

// Local storage keys
const SEARCH_STATE_KEY = 'legal_discovery_search_state'
const SEARCH_TIMESTAMP_KEY = 'legal_discovery_search_timestamp'

// Search state interface
interface SearchState {
  isSearching: boolean
  lastSearchId: string | null
  searchTimestamp: number
}

// Helper functions for localStorage
const getSearchState = (): SearchState => {
  try {
    const stored = localStorage.getItem(SEARCH_STATE_KEY)
    const timestamp = localStorage.getItem(SEARCH_TIMESTAMP_KEY)

    if (stored && timestamp) {
      const parsed = JSON.parse(stored)
      const timestampNum = parseInt(timestamp, 10)

      // Check if the stored state is still valid (within last 5 minutes)
      if (Date.now() - timestampNum < 5 * 60 * 1000) {
        return parsed
      }
    }
  } catch (error) {
    console.warn('Failed to parse search state from localStorage:', error)
  }

  return {
    isSearching: false,
    lastSearchId: null,
    searchTimestamp: 0,
  }
}

const setSearchState = (state: SearchState) => {
  try {
    localStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(state))
    localStorage.setItem(SEARCH_TIMESTAMP_KEY, state.searchTimestamp.toString())
  } catch (error) {
    console.warn('Failed to save search state to localStorage:', error)
  }
}


export const useLegalDataSearch = (
  searchIdfKey: string | undefined,
  formRef?: React.RefObject<{ resetForm?: () => void }>,
  currentFilters?: FilterState
) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<string>('date') // Default sort by date
  const {
    setSearchMetadata,
    setSearchInitiated,
    setFilterState,
    setSearchFormState,
    clearSearchState: clearStoreSearchState,
    isSearchInitiated
  } = useSearchStore()

  // Validate searchIdfKey - if it's empty or just whitespace, treat it as undefined
  const validSearchIdfKey = searchIdfKey && searchIdfKey.trim() !== '' ? searchIdfKey : undefined

  // Initialize search state from localStorage
  const [searchState, setSearchStateLocal] = useState<SearchState>(() => getSearchState())

  // Track the current search ID from both URL and local state
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(validSearchIdfKey || null)

  // Track if we've already populated the form for this search to prevent loops
  const lastPopulatedSearchId = useRef<string | null>(null)

  // Use React 19's useOptimistic to maintain consistent loading state
  // This prevents flickering between POST and GET requests
  const [optimisticLoading, setOptimisticLoading] = useOptimistic(
    false,
    (_state, newLoading: boolean) => newLoading
  )

  // Update localStorage when search state changes
  useEffect(() => {
    setSearchState(searchState)
  }, [searchState])

  // Update currentSearchId when URL changes and reset populated flag
  useEffect(() => {
    setCurrentSearchId(validSearchIdfKey || null)
    // Reset the populated flag when search ID changes
    if (lastPopulatedSearchId.current !== validSearchIdfKey) {
      lastPopulatedSearchId.current = null
    }
  }, [validSearchIdfKey])

  // Simplified logic for when to run the GET query
  // Only run GET query when we have a valid search ID and we're not currently searching
  const shouldRunQuery = (): boolean => {
    // Don't run query if no valid search ID
    if (!validSearchIdfKey) {
      return false
    }

    // Don't run query if we're currently in the middle of a search
    if (searchState.isSearching) {
      return false
    }

    // Don't run query if a search was just initiated (POST request just completed)
    // This prevents the automatic GET request after a POST search
    if (isSearchInitiated) {
      return false
    }

    // Run query if we have a valid search ID and we're not searching
    return true
  }

  // Mutation for initial search (POST request)
  const searchMutation = useMutation({
    mutationFn: (request: LegalDiscoverySearchRequest) =>
      searchLegalData(request, 1, sortBy), // Always start from page 1, pass sort
    retry: false,
    onSuccess: (response) => {
      console.log('API Success: Legal data search completed', { searchId: response.query_id, resultCount: response.cases.length || 0 })

      // Update search state - reset isSearching to false since search is complete
      const newSearchState: SearchState = {
        isSearching: false,
        lastSearchId: response.query_id,
        searchTimestamp: Date.now(),
      }
      setSearchStateLocal(newSearchState)

      // Update current search ID immediately
      setCurrentSearchId(response.query_id)

      // Update Zustand store with search metadata
      setSearchMetadata(response.query_id, Date.now())

      // Mark that search was initiated by user action
      setSearchInitiated(true)

      // Invalidate queries cache so Query Management page shows the latest search
      queryClient.invalidateQueries({ queryKey: ['queries'] })

      // Update URL with search ID while preserving existing filter parameters
      const currentSearch = new URLSearchParams(window.location.search)
      const urlParams = buildSearchParamsFromCurrent(response.query_id, currentSearch)

      navigate({
        to: '/legal-data-discovery',
        search: urlParams,
      })

      // Reset to first page
      setCurrentPage(1)

      // Reset the search initiated flag after a short delay to allow GET request
      setTimeout(() => {
        setSearchInitiated(false)
      }, 100)

      // Keep optimistic loading true - it will be cleared when GET completes
    },
    onError: (error) => {
      console.log('API Error: Legal data search failed', { error: error.message, endpoint: 'legal-data-search' })
      Sentry.captureException(error)

      // Reset search state on error
      const newSearchState: SearchState = {
        isSearching: false,
        lastSearchId: null,
        searchTimestamp: Date.now(),
      }
      setSearchStateLocal(newSearchState)

      // Reset current search ID on error
      setCurrentSearchId(null)

      // Clear optimistic loading on error
      setOptimisticLoading(false)
    },
  })

  // Query for search results (GET request) - only run when conditions are met
  const queryResult = useQuery({
    queryKey: ['searchResults', validSearchIdfKey, currentPage, currentFilters, sortBy],
    queryFn: async () => {
      const result = await getSearchResultsById(validSearchIdfKey!, currentPage, currentFilters, sortBy)

      // Clear optimistic loading when GET request completes successfully
      setOptimisticLoading(false)

      // Populate form from search_query in API response (onSuccess behavior)
      // Only populate once per search ID to prevent infinite loops
      if (result.search_query && lastPopulatedSearchId.current !== validSearchIdfKey) {
        try {
          console.log('Populating form from search_query:', result.search_query)

          // Mark this search ID as populated
          lastPopulatedSearchId.current = validSearchIdfKey || null

          // Transform API response to form data
          const formState = transformAPIResponseToFormData(result.search_query)

          // Transform filters
          const filterState = transformAPIFiltersToFilterState(result.search_query.filters)
          setFilterState(filterState)

          // Update form state
          setSearchFormState(formState)

          console.log('Form populated successfully:', formState)
        } catch (err) {
          console.error('Failed to populate form from search_query:', err)
        }
      }

      return result
    },
    enabled: shouldRunQuery(), // Only run when conditions are met
    staleTime: 0, // Data is immediately stale - always fetch fresh data
    retry: false,
  })

  const {
    data: searchResultsData,
    isLoading: isSearchLoading,
    error: searchError,
  } = queryResult

  // Clear optimistic loading if GET query errors
  useEffect(() => {
    if (searchError) {
      setOptimisticLoading(false)
    }
  }, [searchError, setOptimisticLoading])

  // Handle search submission
  const handleSearch = useCallback(
    async (formData: SearchFormState, filtersToApply: FilterState) => {
      // Reset the populated flag for new search
      lastPopulatedSearchId.current = null

      // Set optimistic loading to true at the start of search
      // This will stay true until the GET request completes
      setOptimisticLoading(true)

      // Set searching state
      const newSearchState: SearchState = {
        isSearching: true,
        lastSearchId: null,
        searchTimestamp: Date.now(),
      }
      setSearchStateLocal(newSearchState)

      // Store filters in search store so they're available for GET requests
      console.log('Storing filters in search store:', filtersToApply)
      setFilterState(filtersToApply)

      // Build filters object for API request using utility function
      const apiFilters = transformFilters(filtersToApply)

      const apiRequest: LegalDiscoverySearchRequest = {
        type: TAB_API_MAPPING[formData.activeTab as keyof typeof TAB_API_MAPPING],
        fields: transformFormDataToFields(formData),
        filters: apiFilters,
      }

      await Sentry.startSpan(
        { name: 'Searching legal data' },
        async () => {
          await searchMutation.mutateAsync(apiRequest)
        },
      )
    },
    [searchMutation, setFilterState, setOptimisticLoading],
  )

  const bookmarkMutation = useMutation({
    mutationFn: (queryId: string) => updateQueryBookmark(queryId, true),
    onSuccess: (response) => {
      console.log('Query bookmarked successfully', response)

      // Update cache so UI stays in sync
      queryClient.invalidateQueries({ queryKey: ['searchResults', validSearchIdfKey, currentPage, currentFilters], exact: false })
    },
    onError: (error) => {
      console.error('Failed to bookmark query', error)
      Sentry.captureException(error)
    },
  })
  // Handle bookmark (save query)
  const handleSaveQuery = useCallback(
    async (queryId: string) => {
      await bookmarkMutation.mutateAsync(queryId)
    },
    [bookmarkMutation],
  )

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    // TanStack Query will automatically refetch when currentPage changes
  }, [])

  // Handle filter changes and update URL
  const handleFilterChange = useCallback((filters: FilterState) => {
    // Handle both dateFrom/dateTo and dateRange.from/dateRange.to structures
    const dateFrom = filters.dateFrom || filters.dateRange?.from
    const dateTo = filters.dateTo || filters.dateRange?.to

    const urlParams = buildSearchParamsObject({
      query_id: validSearchIdfKey,
      filters: {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        riskScore: filters.riskScore,
      }
    })

    // Update URL with filter parameters
    navigate({
      to: '/legal-data-discovery',
      search: urlParams,
    })
  }, [navigate, validSearchIdfKey])

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    // Reset the populated flag
    lastPopulatedSearchId.current = null

    // Clear optimistic loading
    setOptimisticLoading(false)

    // Clear the URL search parameters
    navigate({
      to: '/legal-data-discovery',
      search: { query_id: '' },
    })

    // Reset to first page
    setCurrentPage(1)

    // Reset the search form
    if (formRef?.current.resetForm) {
      formRef.current.resetForm()
    }

    // Clear the query cache for this search
    if (validSearchIdfKey) {
      queryClient.removeQueries({
        queryKey: ['searchResults', validSearchIdfKey],
      })
    }

    // Reset search state and clear localStorage
    const newSearchState: SearchState = {
      isSearching: false,
      lastSearchId: null,
      searchTimestamp: Date.now(),
    }
    setSearchStateLocal(newSearchState)

    // Clear localStorage search state
    try {
      localStorage.removeItem(SEARCH_STATE_KEY)
      localStorage.removeItem(SEARCH_TIMESTAMP_KEY)
    } catch (error) {
      console.warn('Failed to clear localStorage search state:', error)
    }

    // Reset current search ID
    setCurrentSearchId(null)

    // Clear Zustand store search state
    clearStoreSearchState()
  }, [navigate, validSearchIdfKey, queryClient, formRef, clearStoreSearchState, setOptimisticLoading])

  // Handle sort change
  const handleSortChange = useCallback((newSortBy: string) => {
    console.log('Sort changed to:', newSortBy)
    setSortBy(newSortBy)
    setCurrentPage(1) // Reset to first page when sort changes
  }, [])

  // Reset page when search ID changes
  const resetPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  return {
    // State
    currentPage,
    searchResultsData,
    // Use optimistic loading to maintain consistent state across POST and GET requests
    // This prevents flickering by keeping loading=true throughout the entire search flow
    isLoading: optimisticLoading || searchMutation.isPending || isSearchLoading,
    error: searchError,
    hasSearchId: !!currentSearchId, // Use currentSearchId instead of validSearchIdfKey
    isSearching: searchState.isSearching,
    sortBy,

    // Actions
    handleSearch,
    handlePageChange,
    handleClearSearch,
    handleFilterChange,
    handleSortChange,
    resetPage,
    handleSaveQuery
  }
}
