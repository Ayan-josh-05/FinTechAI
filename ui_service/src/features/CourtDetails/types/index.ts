export interface Judge {
  name: string
  position: string
  experience: string
  specialization: string
  activeCases: number
  courtRoom: string
  status: Array<{ text: string, type: string }>
}

export interface CourtInfo {
  code: string
  established: string
  jurisdiction: string
  courtBadges: ReadonlyArray<{ text: string; type: string }>
}

export interface CourtStatistics {
  totalCases: number
  openCases: number
  closedCases: number
}

export interface CourtLocation {
  name: string
  address: ReadonlyArray<string>
}

export interface CaseStatusData {
  label: string
  value: number
  color: string
  percentage: number
}

export interface CaseType {
  label: string
  value: number
}

export interface CourtDetailsData {
  courtInfo: CourtInfo
  statistics: CourtStatistics
  overview: string
  location: CourtLocation
  judges: ReadonlyArray<Judge>
  caseStatusData: ReadonlyArray<CaseStatusData>
  caseTypes: ReadonlyArray<CaseType>
}

export type CourtStatus = 'Active' | 'Inactive' | 'On Leave' | 'District Court' | 'High Court' | 'Supreme Court'