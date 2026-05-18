import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { mapQueryToFormState } from '../utils/queryMapping'
import { useSearchStore } from '../store'
import type { AxiosError } from 'axios'
import type { Query } from '@/features/QueryManagement/types'
import { ToastNotifications } from '@/features/shared/components'
import { getQueryById } from '@/features/QueryManagement/api'

interface FormRef {
  resetForm?: () => void;
  getFormData?: () => any;
}

export const useQueryPopulation = (
  queryId: string | undefined,
  _formRef: React.RefObject<FormRef>,
) => {
  const { setSearchFormState, clearSearchState, setSearchInitiated } = useSearchStore()

  const { data: queryData, isLoading, error } = useQuery<Query, AxiosError>({
    queryKey: ['query', queryId],
    queryFn: () => getQueryById(queryId!),
    enabled: false, // Disable this query completely to avoid unnecessary API calls
    retry: 1, // Retry once in case of network issues
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the data
  })

  // Handle errors
  useEffect(() => {
    if (error) {
      ToastNotifications.error({
        title: error.response?.status === 404 ? 'Query not found' : 'Failed to load query',
        description: 'Please try re-running the query again'
      })
      clearSearchState()
    }
  }, [error, clearSearchState])

  useEffect(() => {
    if (queryData && 'search_query' in queryData) {
      try {
        // Map query data to form state
        const formState = mapQueryToFormState(queryData)

        // Mark as not initiated to allow form updates
        setSearchInitiated(false)

        // Update the form state in the store
        setSearchFormState(formState)
      } catch (err) {
        ToastNotifications.error({
          title: 'Failed to load query data',
          description: 'Please try re-running the query again'
        })

        // Clear search state on error
        clearSearchState()
      }
    }
  }, [queryData, setSearchFormState, clearSearchState, setSearchInitiated])

  // Reset form state when unmounting
  useEffect(() => {
    return () => {
      clearSearchState()
    }
  }, [clearSearchState])

  return {
    isLoading,
    queryData,
  }
}
