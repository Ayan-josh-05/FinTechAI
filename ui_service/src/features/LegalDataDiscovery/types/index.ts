// Shared types for Legal Data Discovery feature

export type RiskLevel = 'low' | 'medium' | 'high'

// API Response Types
export interface CourtInfo {
  name: string
  court_id: string
}

export interface JudgeInfo {
  name: string
  judge_id: string
}

export interface LegalCase {
  case_id: string
  case_name: string
  case_number: string
  cnr_number?: string
  status: 'active' | 'inactive' | 'pending' | 'closed'
  risk: 'High' | 'Medium' | 'Low'
  risk_score?: string
  court: CourtInfo
  judge: JudgeInfo
  location: string
  case_summary: string
}

export interface LegalDiscoverySearchResponse {
  total: number
  page: number
  query_id: string
  cases: Array<LegalCase>
  search_query?: {
    type: string
    fields: Record<string, any>
    filters: Record<string, any>
  }
}

export interface LegalDiscoverySearchRequest {
  type: string
  fields: {
    pan_num?: string
    related_entities?: string
    case_type?: string
    aadhaar_number?: string
    verification_type?: string
    case_category?: string
    associated_entity?: string
    state?: string
    address?: string
    pincode?: string
    district?: string
    name?: string
    father_name?: string
    legal_section?: string
    act_name?: string
    chapter_no?: string
    case_number?: string
    court_name?: string
    filing_year?: string
    judge_name?: string
  }
  filters: {
    date_range?: {
      from_date?: string
      to_date?: string
    }
    legal_act?: string | Array<string>
    risk_score?: RiskLevel
    verification_status?: string
  }
  sort_by?: string
}

// Legacy types for backward compatibility
export interface SearchResult {
  id: string
  case_id: string
  cnr_number?: string
  type: string
  court: string
  judge: string
  location: string
  risk: RiskLevel
  risk_score?: string
  status: string
  description?: string
  // Additional data for hyperlinks
  courtData?: CourtInfo
  judgeData?: JudgeInfo
}

export interface SelectOption {
  value: string
  label: string
}

// Districts API Response Types
export interface District {
  value: string
  label: string
}

export interface DistrictsResponse {
  districts: Array<District>
}

// Error response type (for API errors)
export interface APIErrorDetail {
  loc: [string, number]
  msg: string
  type: string
}

export interface APIErrorResponse {
  detail: Array<APIErrorDetail>
}

export interface FilterState {
  dateFrom?: Date | null
  dateTo?: Date | null
  riskScore?: RiskLevel
  // Additional filters
  dateRange?: {
    from?: Date | null
    to?: Date | null
  }
  riskScoreFilter?: RiskLevel
}

export interface SearchFormState {
  activeTab: string
  // PAN No fields
  panNumber?: string
  relatedEntities?: string
  caseType?: string
  // Aadhaar No fields
  aadhaarNumber?: string
  state?: string
  // Party Name and Address fields
  personName?: string
  district?: string
  // Section Wise fields
  legalSection?: string
  // Case No fields
  caseNumber?: string
  // Advocate Name fields
  advocateName?: string
  advocateOnRecordNumber?: string
  // Judge Name wise Search fields
  judgeName?: string
  courtName?: string
  // Case Type wise fields
  detailedCaseType?: string
  filingYear?: string
}

// Color scheme mappings for consistency
export interface ColorScheme {
  low: 'green'
  medium: 'yellow'
  high: 'red'
  default: 'gray'
}

// Search options API response type
export interface SearchOptions {
  STATES: Array<{ label: string; value: string }>
  CASE_TYPE: Array<{ label: string; value: string }>
  COURTS: Array<{ label: string; value: string }>
  SECTIONS: Array<{ label: string; value: string }>
}