// src/features/OrganizationDetails/types/index.ts

export interface CaseStatusBadge {
  text: string
  color: 'red' | 'yellow' | 'green' | 'purple' | 'gray' | 'success'
}

export interface BasicInfo {
  name: string
  contactInfo: string
  organizationType: string
  address: string
  website: string
  registeredAt: string
}

export interface LegalIdentifier {
  type: string
  value: string
  verified?: boolean
}

export interface OrganizationSummary {
  yearsInBusiness: number
  totalActiveCases: number
  totalClosedCases: number
}

export interface ActiveLegalCase {
  title: string
  caseNo: string
  filed: string
  summary: string
  nextHearing?: string
  statusBadges: Array<CaseStatusBadge>
  linkLabel?: string
}

export interface PastLegalCase {
  title: string
  caseNo: string
  filed: string
  closed: string
  summary: string
  statusBadges: Array<CaseStatusBadge>
  linkLabel?: string
}

export interface OrganizationDetails {
  id: string
  basicInfo: BasicInfo
  legalIdentifiers: Array<LegalIdentifier>
  organizationSummary: OrganizationSummary
  activeLegalCases: Array<ActiveLegalCase>
  pastLegalCases: Array<PastLegalCase>
}

// Legacy types for backward compatibility
export interface Organization {
  id: string;
  name: string;
  type: string;
  registrationNumber: string;
  dateOfIncorporation: string;
  website: string;
  registeredAt: string;
  contactInformation: {
    phone: string;
    email: string;
  };
  address: string;
  lastUpdated: string;
  status: 'Active' | 'Inactive';
  companyType: string;
  legalIdentifiers: {
    cin: string;
    pan: string;
    gstin: string;
  };
  summary: {
    yearsInBusiness: number;
    activeCases: number;
    closedCases: number;
  };
}

export interface LegalCase {
  id: string;
  title: string;
  description: string;
  year: string;
  status: string;
  type: string;
}

export interface LegalActivity {
  id: string;
  title: string;
  description: string;
  date: string;
  status: string;
  type: string;
}
