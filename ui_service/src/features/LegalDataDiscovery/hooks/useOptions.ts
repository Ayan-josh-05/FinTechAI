import { useQuery } from '@tanstack/react-query'
import { fetchOptions } from '../api'
import type { SearchOptions } from '../types'

/**
 * Hook to fetch and manage search options (states, case types, courts, sections)
 */
export const useOptions = () => {
  const {
    data: options,
    isLoading,
    error,
    refetch,
  } = useQuery<SearchOptions>({
    queryKey: ['search-options'],
    queryFn: fetchOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  })

  // Use options directly without adding "All" option
  const transformedOptions = options ? {
    STATES: options.STATES,
    CASE_TYPE: options.CASE_TYPE,
    COURTS: options.COURTS,
    SECTIONS: options.SECTIONS,
  } : null

  return {
    options: transformedOptions,
    rawOptions: options,
    isLoading,
    error,
    refetch,
  }
}
