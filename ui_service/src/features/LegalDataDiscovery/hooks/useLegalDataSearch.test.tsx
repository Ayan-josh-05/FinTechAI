import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useNavigate } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getSearchResultsById, searchLegalData } from '../api'
import { useSearchStore } from '../store'
import { useLegalDataSearch } from './useLegalDataSearch'

// Mock the API functions
vi.mock('../api', () => ({
  getSearchResultsById: vi.fn(),
  searchLegalData: vi.fn(),
}))

// Mock the search store
vi.mock('../store', () => ({
  useSearchStore: vi.fn(),
}))

// Mock the router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
}))

// Mock Sentry
vi.mock('@sentry/tanstackstart-react', () => ({
  captureException: vi.fn(),
  startSpan: vi.fn((_options, fn) => fn()),
}))

const mockGetSearchResultsById = getSearchResultsById as ReturnType<
  typeof vi.fn
>
const mockSearchLegalData = searchLegalData as ReturnType<typeof vi.fn>
const mockUseNavigate = useNavigate as ReturnType<typeof vi.fn>
const mockUseSearchStore = useSearchStore as unknown as ReturnType<typeof vi.fn>

// Mock form ref
const mockFormRef = {
  current: {
    resetForm: vi.fn(),
  },
}

// Mock navigate function
const mockNavigate = vi.fn()

// Mock search store
const mockSearchStore = {
  setSearchMetadata: vi.fn(),
  setSearchInitiated: vi.fn(),
  clearSearchState: vi.fn(),
  getState: vi.fn(() => ({
    isSearchInitiated: false,
  })),
}

// Test data
const mockSearchResponse = {
  query_id: 'test-search-123',
  cases: [],
  total: 0,
}

const mockSearchResults = {
  cases: [],
  total: 0,
}

const mockFormData = {
  activeTab: 'Case No',
  caseNumber: '',
  caseName: '',
  court: '',
  judge: '',
  location: '',
  caseSummary: '',
}

const mockFilters = {
  riskScore: undefined,
  dateRange: {
    from: null,
    to: null,
  },
  riskScoreFilter: undefined,
}

// Helper function to create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Helper function to clear localStorage
const clearLocalStorage = () => {
  localStorage.clear()
  vi.clearAllMocks()
}

describe('useLegalDataSearch', () => {
  beforeEach(() => {
    clearLocalStorage()
    mockUseNavigate.mockReturnValue(mockNavigate)
    mockUseSearchStore.mockReturnValue(mockSearchStore)
    mockSearchLegalData.mockResolvedValue(mockSearchResponse)
    mockGetSearchResultsById.mockResolvedValue(mockSearchResults)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Scenario 1: Page refreshed with empty key - no API call should happen', () => {
    it('should not make any API calls when searchIdfKey is undefined', async () => {
      const { result } = renderHook(
        () => useLegalDataSearch(undefined, mockFormRef),
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(result.current.hasSearchId).toBe(false)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.isSearching).toBe(false)
      })

      expect(mockGetSearchResultsById).not.toHaveBeenCalled()
      expect(mockSearchLegalData).not.toHaveBeenCalled()
    })

    it('should not make any API calls when searchIdfKey is empty string', async () => {
      const { result } = renderHook(() => useLegalDataSearch('', mockFormRef), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.hasSearchId).toBe(false)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.isSearching).toBe(false)
      })

      expect(mockGetSearchResultsById).not.toHaveBeenCalled()
      expect(mockSearchLegalData).not.toHaveBeenCalled()
    })

    it('should not make any API calls when searchIdfKey is whitespace only', async () => {
      const { result } = renderHook(
        () => useLegalDataSearch('   ', mockFormRef),
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(result.current.hasSearchId).toBe(false)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.isSearching).toBe(false)
      })

      expect(mockGetSearchResultsById).not.toHaveBeenCalled()
      expect(mockSearchLegalData).not.toHaveBeenCalled()
    })
  })

  describe('Scenario 2: Page refreshed with valid key - GET API call should happen with loader', () => {
    it('should make GET API call and show loader when page is refreshed with valid searchIdfKey', async () => {
      const { result } = renderHook(
        () => useLegalDataSearch('valid-search-123', mockFormRef),
        { wrapper: createWrapper() },
      )

      // Initially should show loading
      expect(result.current.isLoading).toBe(true)
      expect(result.current.hasSearchId).toBe(true)
      expect(result.current.isSearching).toBe(false)

      // Should make GET API call
      expect(mockGetSearchResultsById).toHaveBeenCalledWith(
        'valid-search-123',
        1,
        undefined, // filters parameter
      )

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.searchResultsData).toEqual(mockSearchResults)
      })

      // Should not make POST API call
      expect(mockSearchLegalData).not.toHaveBeenCalled()
    })

    it('should handle page changes correctly when refreshing with valid key', async () => {
      const { result } = renderHook(
        () => useLegalDataSearch('valid-search-123', mockFormRef),
        { wrapper: createWrapper() },
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Change page
      act(() => {
        result.current.handlePageChange(2)
      })

      // Should make GET API call for new page
      expect(mockGetSearchResultsById).toHaveBeenCalledWith(
        'valid-search-123',
        2,
        undefined, // filters parameter
      )
    })
  })

  describe('Scenario 3: First time search - only POST API call should happen', () => {
    it('should make only POST API call for first time search', async () => {
      const { result } = renderHook(
        () => useLegalDataSearch(undefined, mockFormRef),
        { wrapper: createWrapper() },
      )

      // Initially no search ID
      expect(result.current.hasSearchId).toBe(false)

      // Perform search
      await act(async () => {
        await result.current.handleSearch(mockFormData, mockFilters)
      })

      // Should make POST API call
      expect(mockSearchLegalData).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'case_number_search',
          fields: expect.any(Object),
          filters: expect.any(Object),
        }),
        1,
      )

      // Should not make GET API call initially
      expect(mockGetSearchResultsById).not.toHaveBeenCalled()

      // Wait for search to complete
      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
      })

      // After search completes, should have search ID and make GET call
      expect(result.current.hasSearchId).toBe(true)
    })

    it('should update URL and state after successful search', async () => {
      const { result } = renderHook(
        () => useLegalDataSearch(undefined, mockFormRef),
        { wrapper: createWrapper() },
      )

      // Perform search
      await act(async () => {
        await result.current.handleSearch(mockFormData, mockFilters)
      })

      // Should update URL
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/legal-data-discovery',
        search: { query_id: 'test-search-123' },
      })

      // Should update search store
      expect(mockSearchStore.setSearchMetadata).toHaveBeenCalledWith(
        'test-search-123',
        expect.any(Number),
      )
      expect(mockSearchStore.setSearchInitiated).toHaveBeenCalledWith(true)
    })
  })

  describe('Scenario 4: Subsequent searches - URL update and single API call', () => {
    it('should update URL and make single API call for subsequent searches', async () => {
      const { result } = renderHook(
        () => useLegalDataSearch('existing-search-123', mockFormRef),
        { wrapper: createWrapper() },
      )

      // Initially has search ID
      expect(result.current.hasSearchId).toBe(true)

      // Perform new search
      await act(async () => {
        await result.current.handleSearch(mockFormData, mockFilters)
      })

      // Should make POST API call
      expect(mockSearchLegalData).toHaveBeenCalledTimes(1)

      // Should update URL with new search ID
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/legal-data-discovery',
        search: { query_id: 'test-search-123' },
      })

      // Should not make multiple API calls
      expect(mockSearchLegalData).toHaveBeenCalledTimes(1)
    })

    it('should clear previous search results when starting new search', async () => {
      const { result } = renderHook(
        () => useLegalDataSearch('existing-search-123', mockFormRef),
        { wrapper: createWrapper() },
      )

      // Perform new search
      await act(async () => {
        await result.current.handleSearch(mockFormData, mockFilters)
      })

      // After search completes, searching state should be false
      expect(result.current.isSearching).toBe(false)

      // Should have new search ID
      expect(result.current.hasSearchId).toBe(true)
    })
  })

  describe('Error handling', () => {
    it('should handle search errors gracefully', async () => {
      // Mock the search to fail
      mockSearchLegalData.mockRejectedValueOnce(new Error('Search failed'))

      const { result } = renderHook(
        () => useLegalDataSearch(undefined, mockFormRef),
        { wrapper: createWrapper() },
      )

      // Perform search that will fail
      await act(async () => {
        try {
          await result.current.handleSearch(mockFormData, mockFilters)
        } catch (error) {
          // Expected to fail
        }
      })

      // Should reset search state on error
      expect(result.current.isSearching).toBe(false)
      expect(result.current.hasSearchId).toBe(false)
    })
  })

  describe('Clear search functionality', () => {
    it('should clear search state and reset form when clearing search', async () => {
      const { result } = renderHook(
        () => useLegalDataSearch('valid-search-123', mockFormRef),
        { wrapper: createWrapper() },
      )

      // Clear search
      act(() => {
        result.current.handleClearSearch()
      })

      // Should clear URL
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/legal-data-discovery',
        search: { query_id: '' },
      })

      // Should reset form
      expect(mockFormRef.current.resetForm).toHaveBeenCalled()

      // Should clear search store
      expect(mockSearchStore.clearSearchState).toHaveBeenCalled()
    })
  })

  describe('Local storage persistence', () => {
    it('should persist search state to localStorage', async () => {
      const { result } = renderHook(
        () => useLegalDataSearch(undefined, mockFormRef),
        { wrapper: createWrapper() },
      )

      // Perform search
      await act(async () => {
        await result.current.handleSearch(mockFormData, mockFilters)
      })

      // Check if state was persisted
      const storedState = localStorage.getItem('legal_discovery_search_state')
      const storedTimestamp = localStorage.getItem(
        'legal_discovery_search_timestamp',
      )

      expect(storedState).toBeTruthy()
      expect(storedTimestamp).toBeTruthy()

      const parsedState = JSON.parse(storedState!)
      expect(parsedState.lastSearchId).toBe('test-search-123')
      expect(parsedState.isSearching).toBe(false)
    })
  })
})
