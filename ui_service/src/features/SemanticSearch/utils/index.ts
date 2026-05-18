import { SEARCH_LIMITS } from '../constants'
import type { SemanticSearchFilters } from '../types'

export const validateSearchQuery = (query: string): string | null => {
  if (!query || query.trim().length < SEARCH_LIMITS.MIN_QUERY_LENGTH) {
    return `Query must be at least ${SEARCH_LIMITS.MIN_QUERY_LENGTH} characters long`
  }

  if (query.length > SEARCH_LIMITS.MAX_QUERY_LENGTH) {
    return `Query must be no more than ${SEARCH_LIMITS.MAX_QUERY_LENGTH} characters long`
  }

  return null
}

export const parseSearchUrl = (searchParams: URLSearchParams): { query: string; filters?: SemanticSearchFilters } => {
  const query = searchParams.get('q') || ''
  const filters: SemanticSearchFilters = {}

  const filterKeys = ['dateFrom', 'dateTo', 'legalAct', 'riskScore', 'verificationStatus']
  filterKeys.forEach(key => {
    const value = searchParams.get(key)
    if (value) {
      filters[key as keyof SemanticSearchFilters] = value
    }
  })

  return { query, filters: Object.keys(filters).length > 0 ? filters : undefined }
}
