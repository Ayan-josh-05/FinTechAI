import { RISK_COLOR_MAP, RISK_LABEL_MAP, TAB_API_MAPPING } from '../constants'
import type { FilterState, RiskLevel, SearchFormState } from '../types'
import { formatDateForAPI, parseAPIDateString } from '@/utils/dateUtils'

/**
 * Get color scheme for risk level
 */
export const getRiskColor = (risk: RiskLevel): 'green' | 'yellow' | 'red' => {
  return RISK_COLOR_MAP[risk]
}

/**
 * Get human readable label for risk level
 */
export const getRiskLabel = (risk: RiskLevel): string => {
  return RISK_LABEL_MAP[risk] || 'Unknown'
}

/**
 * Get color scheme for status
 */
export const getStatusColor = (status: string): 'orange' | 'gray' => {
  return status.includes('Active') ? 'orange' : 'gray'
}

/**
 * Format results count
 */
export const formatResultsCount = (count: number): string => {
  return `${count} results found`
}

/**
 * Validate Aadhaar number format (basic validation)
 */
export const validateAadhaar = (aadhaar: string): boolean => {
  // Remove spaces and check if it's 12 digits or contains masked format
  const cleaned = aadhaar.replace(/\s/g, '')
  return /^\d{12}$/.test(cleaned) || /^\*{4}-?\*{4}-?\d{4}$/.test(cleaned)
}

/**
 * Format Aadhaar number with spaces
 */
export const formatAadhaar = (aadhaar: string): string => {
  const cleaned = aadhaar.replace(/\s/g, '')
  return cleaned.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')
}

/**
 * Check if a tab is active
 */
export const isTabActive = (currentTab: string, tabName: string): boolean => {
  return currentTab === tabName
}

/**
 * Generate pagination info
 */
export const getPaginationInfo = (currentPage: number, totalPages: number): string => {
  return `${currentPage} / ${totalPages}`
}

/**
 * Transform form data to API request fields format
 * 
 * Returns fields directly under the 'fields' key without nesting under tab-specific keys.
 * This matches the expected API payload structure:
 * {
 *   "type": "pan_search",
 *   "fields": {
 *     "pan_num": "asdsasdsad",
 *     "related_entities": "asdsdsad", 
 *     "case_type": "all"
 *   },
 *   "filters": {},
 *   "page": 1,
 *   "limit": 20
 * }
 */
export const transformFormDataToFields = (formData: any) => {
  // Helper function to include field if it has a value (including default values like "all")
  const includeField = (value: any, fieldName: string) => {
    if (value !== undefined && value !== null && value !== '') {
      return { [fieldName]: value }
    }
    return {}
  }

  // Return fields directly without nesting under tab key
  return {
    // PAN No fields
    ...includeField(formData.panNumber, 'pan_num'),
    ...includeField(formData.relatedEntities, 'related_entities'),
    ...includeField(formData.caseType, 'case_type'),
    // Aadhaar No fields - remove spaces before sending to API
    ...includeField(formData.aadhaarNumber?.replace(/\s/g, ''), 'aadhaar_number'),
    ...includeField(formData.verificationType, 'verification_type'),
    ...includeField(formData.caseCategory, 'case_category'),
    ...includeField(formData.associatedEntity, 'associated_entity'),
    ...includeField(formData.state, 'state'),
    // Address fields
    ...includeField(formData.address, 'address'),
    ...includeField(formData.pincode, 'pincode'),
    ...includeField(formData.district, 'district'),
    // Name + Address fields
    ...includeField(formData.personName, 'name'),
    ...includeField(formData.fatherName, 'father_name'),
    // Section-wise fields
    ...includeField(formData.legalSection, 'legal_section'),
    ...includeField(formData.actName, 'act_name'),
    ...includeField(formData.chapterNo, 'chapter_no'),
    // Case No fields
    ...includeField(formData.caseNumber, 'case_number'),
    ...includeField(formData.courtName, 'court_name'),
    ...includeField(formData.filingYear, 'filing_year'),
    // Judge Name fields
    ...includeField(formData.judgeName, 'judge_name'),
    // Advocate Name fields
    ...includeField(formData.advocateName, 'advocate_name'),
    ...includeField(formData.advocateOnRecordNumber, 'advocate_on_record_number'),
    // Case Type fields
    ...includeField(formData.detailedCaseType, 'case_type'),
  }
}

/**
 * Transform FilterState to API format for both POST and GET requests
 * Uses consistent format for both request types
 * @param filters - The filter state to transform
 */
export const transformFilters = (filters: FilterState) => {
  console.log('transformFilters: Input filters:', filters)
  const result: any = {}

  // Date range filter - handle both dateFrom/dateTo and dateRange.from/dateRange.to
  const dateFrom = filters.dateFrom || filters.dateRange?.from
  const dateTo = filters.dateTo || filters.dateRange?.to

  console.log('transformFilters: Extracted dates:', { dateFrom, dateTo })

  if (dateFrom || dateTo) {
    result.date_range = {
      from_date: formatDateForAPI(dateFrom),
      to_date: formatDateForAPI(dateTo)
    }
  }

  // Risk score filter
  if (filters.riskScore) {
    result.risk_score = filters.riskScore
  }

  console.log('transformFilters: Result:', result)
  return result
}

/**
 * Transform API response back to form state
 * Converts the search_query from API response to SearchFormState
 * @param apiResponse - The API response containing type, fields, and filters
 */
export const transformAPIResponseToFormData = (apiResponse: {
  type: string
  fields: Record<string, any>
  filters: Record<string, any>
}): SearchFormState => {
  console.log('transformAPIResponseToFormData: API response:', apiResponse)

  // Reverse mapping of TAB_API_MAPPING to get tab name from type
  const API_TO_TAB_MAPPING = Object.entries(TAB_API_MAPPING).reduce(
    (acc, [tabName, apiType]) => {
      acc[apiType] = tabName
      return acc
    },
    {} as Record<string, string>
  )

  const activeTab = API_TO_TAB_MAPPING[apiResponse.type] || 'PAN No.'

  // Mapping of API field names to form field names
  const apiFieldToFormField: Record<string, string> = {
    pan_num: 'panNumber',
    related_entities: 'relatedEntities',
    case_type: 'caseType',
    aadhaar_number: 'aadhaarNumber',
    state: 'state',
    district: 'district',
    name: 'personName',
    legal_section: 'legalSection',
    case_number: 'caseNumber',
    court_name: 'courtName',
    filing_year: 'filingYear',
    judge_name: 'judgeName',
    advocate_name: 'advocateName',
    advocate_on_record_number: 'advocateOnRecordNumber',
  }

  // Build form data from API fields
  const formData: SearchFormState = {
    activeTab,
  }

  // Map API fields to form fields, excluding null values
  Object.entries(apiResponse.fields).forEach(([apiKey, value]) => {
    if (value !== null && value !== undefined) {
      const formKey = apiFieldToFormField[apiKey]
      // Handle special case for detailedCaseType which uses case_type in API
      if (apiKey === 'case_type' && activeTab === 'Case Type') {
        formData.detailedCaseType = value
      } else if (formKey) {
        (formData as any)[formKey] = value
      }
    }
  })
  console.log('transformAPIResponseToFormData: Form data:', formData)
  return formData
}

/**
 * Transform API filters back to FilterState
 * @param apiFilters - The filters from API response
 */
export const transformAPIFiltersToFilterState = (apiFilters: {
  date_range?: { from_date?: string; to_date?: string } | null
  risk_score?: RiskLevel | null
  legal_act?: string | Array<string> | null
}): FilterState => {
  const filterState: FilterState = {
    dateFrom: undefined,
    dateTo: undefined,
    riskScore: undefined,
    dateRange: {
      from: null,
      to: null,
    },
    riskScoreFilter: undefined,
  }

  // Transform date range
  if (apiFilters.date_range) {
    const fromDate = parseAPIDateString(apiFilters.date_range.from_date)
    const toDate = parseAPIDateString(apiFilters.date_range.to_date)

    filterState.dateFrom = fromDate
    filterState.dateTo = toDate
    filterState.dateRange = {
      from: fromDate,
      to: toDate,
    }
  }

  // Transform risk score
  if (apiFilters.risk_score) {
    filterState.riskScore = apiFilters.risk_score
    filterState.riskScoreFilter = apiFilters.risk_score
  }

  return filterState
}
