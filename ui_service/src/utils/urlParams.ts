export interface FilterParams {
  dateFrom?: string | Date
  dateTo?: string | Date
  legalAct?: string
  legalActs?: Array<string>
  riskScore?: string
  verificationStatus?: string
}

export interface SearchParams {
  query_id?: string
  filters?: FilterParams
}

/**
 * Builds URL search parameters for legal data discovery pages
 * @param params - Object containing query_id and optional filters
 * @returns URLSearchParams object with all relevant parameters
 */
export const buildSearchParams = (params: SearchParams): URLSearchParams => {
  const searchParams = new URLSearchParams()

  if (params.query_id) {
    searchParams.set('query_id', params.query_id)
  }

  if (params.filters) {
    const { dateFrom, dateTo, legalAct, legalActs, riskScore, verificationStatus } = params.filters

    if (dateFrom) {
      const dateValue = dateFrom instanceof Date ? dateFrom.toISOString() : dateFrom
      searchParams.set('dateFrom', dateValue)
    }
    if (dateTo) {
      const dateValue = dateTo instanceof Date ? dateTo.toISOString() : dateTo
      searchParams.set('dateTo', dateValue)
    }
    if (legalAct) {
      searchParams.set('legalAct', legalAct)
    }
    if (legalActs && legalActs.length > 0) {
      searchParams.set('legalAct', legalActs.join(','))
    }
    if (riskScore) {
      searchParams.set('riskScore', riskScore)
    }
    if (verificationStatus && verificationStatus !== '') {
      searchParams.set('verificationStatus', verificationStatus)
    }
  }

  return searchParams
}

/**
 * Builds URL search parameters object for TanStack Router navigation
 * @param params - Object containing query_id and optional filters
 * @returns Object with all relevant parameters for router navigation
 */
export const buildSearchParamsObject = (params: SearchParams): Record<string, string> => {
  const searchParams = buildSearchParams(params)
  const result: Record<string, string> = {}

  for (const [key, value] of searchParams.entries()) {
    result[key] = value
  }

  return result
}

/**
 * Builds URL search parameters from existing URL search params and new search ID
 * @param searchIdfKey - The new search ID to set
 * @param currentSearch - Current URLSearchParams to preserve existing filters
 * @returns Object with all relevant parameters for router navigation
 */
export const buildSearchParamsFromCurrent = (
  queryId: string,
  currentSearch: URLSearchParams
): Record<string, string> => {
  const urlParams: Record<string, string> = {
    query_id: queryId,
  }

  // Preserve existing filter parameters
  const filterKeys = ['dateFrom', 'dateTo', 'legalAct', 'riskScore', 'verificationStatus']
  filterKeys.forEach(key => {
    const value = currentSearch.get(key)
    if (value) {
      urlParams[key] = value
    }
  })

  return urlParams
}
