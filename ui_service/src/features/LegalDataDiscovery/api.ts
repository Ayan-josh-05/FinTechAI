import * as Sentry from '@sentry/tanstackstart-react'
import { transformFilters } from './utils/helpers'
import { PER_PAGE } from './constants'
import type {
  FilterState,
  LegalDiscoverySearchRequest,
  LegalDiscoverySearchResponse
} from './types'
import api from '@/integrations/axiosInterceptor'

/**
 * Search for legal data based on the provided criteria
 */
export const searchLegalData = async (
  searchParams: LegalDiscoverySearchRequest,
  page: number = 1,
  sortBy: string = 'date'
): Promise<LegalDiscoverySearchResponse> => {
  return Sentry.startSpan(
    { name: 'Searching legal data discovery' },
    async () => {
      console.log('POST API: Search params:', searchParams)
      console.log('POST API: Sort by:', sortBy)
      const response = await api.post('/search/legal-discovery', {
        ...searchParams,
        page,
        page_size: PER_PAGE,
        sort_by: sortBy,
      })
      return response.data
    }
  )
}

/**
 * Retrieve search results by query_id with optional filters
 */
export const getSearchResultsById = async (
  queryId: string,
  page: number = 1,
  filters?: FilterState,
  sortBy: string = 'date'
): Promise<LegalDiscoverySearchResponse> => {
  return Sentry.startSpan(
    { name: 'Retrieving legal data discovery results by ID' },
    async () => {
      // Build query parameters
      const params: any = {
        page,
        page_size: PER_PAGE,
        sort_by: sortBy,
      }

      // Add filters to query parameters if provided
      if (filters) {
        console.log('GET API: Filters received:', filters)
        const filterParams = transformFilters(filters)
        console.log('GET API: Transformed filters:', filterParams)

        // Wrap filters under 'filters' key to match POST request structure
        Object.keys(filterParams).forEach(key => {
          if (typeof filterParams[key] === 'object' && filterParams[key] !== null) {
            // Handle nested objects like date_range
            Object.keys(filterParams[key]).forEach(nestedKey => {
              params[`filters.${key}.${nestedKey}`] = filterParams[key][nestedKey]
            })
          } else {
            params[`filters.${key}`] = filterParams[key]
          }
        })
      } else {
        console.log('GET API: No filters provided')
      }

      console.log('GET API: Sort by:', sortBy)
      console.log('GET API: Final params:', params)
      const response = await api.get(`/search/legal-discovery/${queryId}`, {
        params,
      })
      return response.data
    }
  )
}

/**
 * Fetch districts for a given state
 */
export const getDistrictsByState = async (state: string): Promise<Array<{ label: string; value: string }>> => {
  return Sentry.startSpan(
    { name: 'Fetching districts by state' },
    async () => {
      const response = await api.get('/search/districts', {
        params: { state }
      })
      // Handle new response format: {'DISTRICTS': [{label: "", value: ""}]}
      return response.data.DISTRICTS || []
    }
  )
}

/**
 * Fetch state and district information by pincode
 */
export const getStateDistrictByPincode = async (pincode: string): Promise<{ state: string; district: string }> => {
  return Sentry.startSpan(
    { name: 'Fetching state and district by pincode' },
    async () => {
      const response = await api.get('/search/state/district', {
        params: { pincode }
      })
      return response.data
    }
  )
}

/**
 * Fetch available search options including states, case types, courts, and sections
 */
export const fetchOptions = async (): Promise<{
  STATES: Array<{ label: string; value: string }>
  CASE_TYPE: Array<{ label: string; value: string }>
  COURTS: Array<{ label: string; value: string }>
  SECTIONS: Array<{ label: string; value: string }>
}> => {
  return Sentry.startSpan(
    { name: 'Fetching search options' },
    async () => {
      const response = await api.get('/search/options')
      return response.data
    }
  )
}