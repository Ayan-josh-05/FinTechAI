import {
  Suspense,
  lazy,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'
import { useSearch } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'

import { TEXT_CONTENT } from '../constants'
import { useLegalDataSearch } from '../hooks/useLegalDataSearch'
import { useQueryPopulation } from '../hooks/useQueryPopulation'
import { useSearchStore } from '../store'
import type { FilterState, SearchFormState } from '../types'
import {
  Card,
  ComponentLoading,
  ToastNotifications,
} from '@/features/shared/components'
import { PageLayout } from '@/features/shared/layout/PageLayout'
import { deepEqual } from '@/utils/objectUtils'
import { parseAPIDateString } from '@/utils/dateUtils'

import { COLORS } from '@/features/shared/constants/StyleConstants'
// Lazy load the heavy components
const FilterSidebar = lazy(() => import('./FilterSidebar'))
const SearchForm = lazy(() => import('./SearchForm'))
const SearchResults = lazy(() => import('./SearchResult'))

// Custom loading component that matches FilterSidebar dimensions
const FilterLoading = memo(() => (
  <Card
    w="64" // Same width as FilterSidebar
    borderColor={COLORS.neutral[200]}
    bg="white"
    shadow="sm"
    overflow="hidden"
  >
    <ComponentLoading message="Loading filters..." />
  </Card>
))

FilterLoading.displayName = 'FilterLoading'

// Custom loading component that matches SearchForm dimensions
const SearchFormLoading = memo(() => (
  <Card p={6} variant="elevated">
    <ComponentLoading message="Loading search form..." />
  </Card>
))

SearchFormLoading.displayName = 'SearchFormLoading'

// Custom loading component that matches SearchResults dimensions
const SearchResultsLoading = memo(() => (
  <Card variant="elevated" bg="transparent" boxShadow="none" border="none">
    <ComponentLoading message="Loading search results..." />
  </Card>
))

SearchResultsLoading.displayName = 'SearchResultsLoading'

const LegalDataDiscovery = memo(() => {
  const search = useSearch({ from: '/legal-data-discovery' })
  const searchFormRef = useRef<any>(null)
  const { filterState, setFilterState, clearSearchState } = useSearchStore()

  // Use query population hook when query_id is present
  const { isLoading: isLoadingQuery } = useQueryPopulation(
    search.query_id,
    searchFormRef,
  )
  const queryClient = useQueryClient()

  const [resetFilters, setResetFilters] = useState(false)

  // Use filters directly from URL parameters
  const urlFilters: FilterState = {
    dateFrom: parseAPIDateString(search.dateFrom),
    dateTo: parseAPIDateString(search.dateTo),
    riskScore: search.riskScore || undefined,
    dateRange: {
      from: parseAPIDateString(search.dateFrom),
      to: parseAPIDateString(search.dateTo),
    },
    riskScoreFilter: search.riskScore || undefined,
  }

  // Use URL filters as the primary source, fallback to store/component state
  const finalFilters = urlFilters

  // Use custom hook for search logic
  const {
    currentPage,
    searchResultsData,
    isLoading,
    error,
    hasSearchId,
    handleSearch,
    handlePageChange,
    handleClearSearch,
    handleFilterChange,
    handleSortChange,
    resetPage,
    handleSaveQuery: saveQueryFn,
    sortBy,
  } = useLegalDataSearch(search.query_id, searchFormRef, finalFilters)

  // Transform API response to component state
  const searchResults = useMemo(() => {
    if (!searchResultsData) {
      return []
    }

    if (searchResultsData.cases.length === 0) {
      return []
    }
    return searchResultsData.cases.map((legalCase) => ({
      id: legalCase.case_number,
      case_id: legalCase.case_id,
      cnr_number: legalCase.cnr_number,
      type: legalCase.case_name,
      court: legalCase.court.name,
      judge: legalCase.judge.name,
      location: legalCase.location,
      risk: legalCase.risk.toLowerCase() as any,
      risk_score: legalCase.risk_score,
      status: legalCase.status,
      description: legalCase.case_summary,
      courtData: legalCase.court,
      judgeData: legalCase.judge,
    }))
  }, [searchResultsData])

  const totalResults = searchResultsData?.total || 0

  // Show loading state only when actively searching or when results are loading
  // Don't show loading just because we have a search ID - the GET request might be complete
  // Note: isLoading from the hook already includes optimistic loading state to prevent flickering
  const showLoading = useMemo(() => {
    const loading = isLoading || isLoadingQuery
    return loading
  }, [isLoading, isLoadingQuery])
  console.log('showLoading', showLoading)
  // Handler functions
  const handleSearchSubmit = useCallback(
    async (formData: SearchFormState) => {
      console.log('handleSearchSubmit: Using URL filters:', urlFilters)
      await handleSearch(formData, urlFilters)
    },
    [handleSearch, urlFilters],
  )

  const handleSaveQuery = useCallback(() => {
    if (search.query_id) {
      saveQueryFn(search.query_id)
      ToastNotifications.querySaved()
    } else {
      console.warn('No query_id found, cannot save query')
    }
  }, [saveQueryFn, search.query_id])

  // Initialize filters from URL parameters and store on mount
  useEffect(() => {
    const urlFiltersFromEffect: FilterState = {
      dateFrom: parseAPIDateString(search.dateFrom),
      dateTo: parseAPIDateString(search.dateTo),
      riskScore: search.riskScore || undefined,
      dateRange: {
        from: parseAPIDateString(search.dateFrom),
        to: parseAPIDateString(search.dateTo),
      },
      riskScoreFilter: search.riskScore || undefined,
    }

    // Use store filters if available and no URL filters, otherwise use URL filters
    const hasUrlFilters = search.dateFrom || search.dateTo || search.riskScore
    const resolvedFilters = hasUrlFilters
      ? urlFiltersFromEffect
      : filterState || urlFiltersFromEffect

    // Only update store if it's different to avoid circular updates
    if (!deepEqual(filterState, resolvedFilters)) {
      setFilterState(resolvedFilters)
    }
  }, [
    search.dateFrom,
    search.dateTo,
    search.riskScore,
    setFilterState,
    filterState,
  ])

  const handleFiltersChange = useCallback(
    (filters: FilterState) => {
      // Only update store if it's different to avoid circular updates
      if (!deepEqual(filterState, filters)) {
        setFilterState(filters)
      }
      handleFilterChange(filters)
    },
    [handleFilterChange, filterState, setFilterState],
  )

  const handleApplyFilters = useCallback(
    async (filters: FilterState) => {
      // Only update store if it's different to avoid circular updates
      if (!deepEqual(filterState, filters)) {
        setFilterState(filters)
      }

      // Update URL with filter parameters
      handleFilterChange(filters)

      // If we have a search ID, we need to trigger a new search with the filters
      if (search.query_id) {
        // Get the current search form data from the form ref
        const formData = searchFormRef.current?.getFormData?.()
        if (formData) {
          await handleSearch(formData, filters)
        }
      }
    },
    [
      setFilterState,
      handleFilterChange,
      handleSearch,
      search.query_id,
      filterState,
    ],
  )

  const handleClearFilters = useCallback(async () => {
    const clearedFilters = {
      riskScore: undefined,
      dateRange: {
        from: null,
        to: null,
      },
      riskScoreFilter: undefined,
    }

    // Only update store if it's different to avoid circular updates
    if (!deepEqual(filterState, clearedFilters)) {
      setFilterState(clearedFilters)
    }

    handleFilterChange(clearedFilters)

    // If we have a search ID, trigger a new search with cleared filters
    if (search.query_id) {
      const formData = searchFormRef.current?.getFormData?.()
      if (formData) {
        await handleSearch(formData, clearedFilters)
      }
    }
  }, [
    setFilterState,
    handleFilterChange,
    handleSearch,
    search.query_id,
    filterState,
  ])

  const handleHelpClick = useCallback(() => {
    // Show help modal or navigate to help page
  }, [])

  // Reset page when search ID changes
  useEffect(() => {
    if (search.query_id && search.query_id.trim() !== '') {
      resetPage()
    }
  }, [search.query_id, resetPage])

  // Reset all states when navigating to the page without a search ID
  // This ensures a clean state when clicking on the nav bar item
  useEffect(() => {
    const hasValidSearchId = search.query_id && search.query_id.trim() !== ''

    // If there's no search ID in the URL, reset all states
    if (!hasValidSearchId) {
      // Clear the search store
      clearSearchState()

      // Reset current filters to defaults
      const defaultFilters = {
        riskScore: undefined,
        dateRange: {
          from: null,
          to: null,
        },
        riskScoreFilter: undefined,
      }

      // Only update store if it's different to avoid circular updates
      if (!deepEqual(filterState, defaultFilters)) {
        setFilterState(defaultFilters)
      }

      // Reset the search form if available
      if (searchFormRef.current?.resetForm) {
        searchFormRef.current.resetForm()
      }

      // Clear localStorage search state
      try {
        localStorage.removeItem('legal_discovery_search_state')
        localStorage.removeItem('legal_discovery_search_timestamp')
      } catch (err) {
        console.warn('Failed to clear localStorage search state:', err)
      }

      // Clear query cache for search results
      queryClient.removeQueries({ queryKey: ['searchResults'] })

      // Trigger FilterSidebar reset
      setResetFilters(true)

      // Reset the reset flag after a short delay
      setTimeout(() => {
        setResetFilters(false)
      }, 100)
    }
  }, [search.query_id, setFilterState, clearSearchState, queryClient])

  // Reset entire search state when component unmounts
  useEffect(() => {
    return () => {
      // Clear all search state including form data, filters, and search metadata
      clearSearchState()
    }
  }, [clearSearchState])

  return (
    <PageLayout py={3}>
      <Flex gap={6} align="flex-start">
        {/* Left Sidebar */}
        <Box flexShrink={0} alignSelf="stretch">
          <Box h="100%">
            <Suspense fallback={<FilterLoading />}>
              <FilterSidebar
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
                onApplyFilters={handleApplyFilters}
                reset={resetFilters}
                hasSearchId={hasSearchId}
              />
            </Suspense>
          </Box>
        </Box>

        {/* Main Content */}
        <Box flex={1}>
          {/* Page Title (no background) */}
          <Box mb={4} ml={8}>
            <Text
              fontSize={{ base: 'xl', md: '2xl' }}
              fontWeight="bold"
              color={COLORS.neutral[800]}
            >
              {TEXT_CONTENT.header.title}
            </Text>
            <Text color={COLORS.text.secondary}>
              {TEXT_CONTENT.header.subtitle}
            </Text>
          </Box>
          <Box mb={6} ml={8}>
            <Suspense fallback={<SearchFormLoading />}>
              <SearchForm
                ref={searchFormRef}
                onSearch={handleSearchSubmit}
                onSaveQuery={handleSaveQuery}
                isLoading={showLoading}
                hasSearched={hasSearchId}
              />
            </Suspense>
          </Box>
          <Box ml={8}>
            <Suspense fallback={<SearchResultsLoading />}>
              <SearchResults
                results={searchResults}
                onSortChange={handleSortChange}
                onPageChange={handlePageChange}
                onHelpClick={handleHelpClick}
                onClearSearch={handleClearSearch}
                totalResults={totalResults}
                currentPage={currentPage}
                isLoading={showLoading}
                hasSearched={hasSearchId}
                error={error || undefined}
                sortBy={sortBy}
              />
            </Suspense>
          </Box>
        </Box>
      </Flex>
    </PageLayout>
  )
})

LegalDataDiscovery.displayName = 'LegalDataDiscovery'

export default LegalDataDiscovery
