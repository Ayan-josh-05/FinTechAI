// src/features/user-details/types.tsx

export interface StatusBadge {
  text: string
  type: 'approved' | 'inactive' | 'pending' | 'rejected' | 'warning'
}

export interface PersonalInformation {
  fullName: string
  dateOfBirth: string
  gender: string
  occupation: string
}

export interface IdentityDocument {
  verified: boolean
  number?: string
  numberMasked?: string
  nameOnPan?: string
  nameOnAadhar?: string
  verifiedOn: string
}

export interface IdentityDocuments {
  pan: IdentityDocument
  aadhar: IdentityDocument
}

export interface Addresses {
  permanent: string
  current: string
}

export interface Account {
  verification: string
  accountType: string
  riskLevel: string
  casesCount: {
    active: number
    closed: number
  }
}

export interface CaseStatusBadge {
  text: string
  color: 'red' | 'yellow' | 'green' | 'purple' | 'gray'
}

export interface ActiveLegalCase {
  case_id: string
  title: string
  caseNo: string
  filed: string
  summary: string
  nextHearing?: string
  statusBadges: Array<CaseStatusBadge>
  linkLabel?: string
}

export interface PastLegalCase {
  case_id: string
  title: string
  caseNo: string
  filed: string
  closed: string
  summary: string
  statusBadges: Array<CaseStatusBadge>
  linkLabel?: string
}

export interface LegalInteraction {
  dot: 'blue' | 'green' | 'yellow'
  title: string
  context: string
  note: string
}

export interface UserDetails {
  id: string
  fullName: string
  profileImage?: string
  registrationDate: string
  lastLogin: string
  status: Array<StatusBadge>
  personalInformation: PersonalInformation
  identityDocuments: IdentityDocuments
  addresses: Addresses
  account: Account
  activeLegalCases: Array<ActiveLegalCase>
  pastLegalCases: Array<PastLegalCase>
  legalInteractions: Array<LegalInteraction>
}

// Legacy types for backward compatibility
export interface UserDetailsHeader {
  title: string
  statusBadges: Array<StatusBadge>
  headerInfo: Array<{ label: string; value: string | React.ReactNode }>
  profileImage?: string
}
