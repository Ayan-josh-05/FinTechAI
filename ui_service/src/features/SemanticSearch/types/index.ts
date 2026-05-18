export interface SemanticSearchFilters {
  dateFrom?: string
  dateTo?: string
  legalAct?: string
  riskScore?: string
  verificationStatus?: string
}

export interface SemanticSearchQuery {
  query: string
  filters?: SemanticSearchFilters
  limit?: number
  offset?: number
}
