import { transformAPIResponseToFormData } from './helpers'
import type { Query } from '@/features/QueryManagement/types'
import type { SearchFormState } from '../types'

/**
 * Map Query data to SearchFormState
 * Uses the transformAPIResponseToFormData helper to convert API response structure
 * to form state structure based on the type and fields mapping
 */
export const mapQueryToFormState = (query: Query): SearchFormState => {
  // Get the search query data
  const { type, fields, filters } = query.search_query

  // Use the helper function to transform API response to form data
  const formState = transformAPIResponseToFormData({
    type,
    fields,
    filters: filters || {}
  })

  return formState
}
