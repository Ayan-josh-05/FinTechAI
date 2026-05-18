import type { RiskLevel } from '../types'

// Search tab options
export const SEARCH_TABS = [
  'PAN No.',
  'Aadhaar No.',
  'Party Name and Address',
  'Section Wise',
  'Case / CNR No.',
  'Advocate Name',
  'Judge Name',
  'Case Type',
]

// Mapping from display tab names to API request values
export const TAB_API_MAPPING = {
  'PAN No.': 'pan_search',
  'Aadhaar No.': 'aadhaar_search',
  'Party Name and Address': 'party_name_address_search',
  'Section Wise': 'section_search',
  'Case / CNR No.': 'case_number_search',
  'Advocate Name': 'advocate_search',
  'Judge Name': 'judge_search',
  'Case Type': 'case_type_search',
} as const

// Pagination constant - re-export from shared constants
export { PER_PAGE } from '@/features/shared/constants'

// Sort options for search results
export const SORT_OPTIONS = [
  { value: 'date', label: 'Sort by Date' },
  { value: 'risk', label: 'Sort by Risk' },
]

// Field configurations for each search tab
export const TAB_FIELD_CONFIG = {
  'PAN No.': [
    {
      key: 'panNumber',
      label: 'PAN Number',
      type: 'input',
      placeholder: 'Enter PAN number (e.g., ABCDE1234F)',
    },
    {
      key: 'caseType',
      label: 'Case Type',
      type: 'input',
      placeholder: 'Enter case type',
    },
  ],
  'Aadhaar No.': [
    {
      key: 'aadhaarNumber',
      label: 'Aadhaar Number',
      type: 'input',
      placeholder: 'Enter Aadhaar number (e.g. 1234 5678 9012)',
      helper: 'Enter 12-digit Aadhaar number',
    },
    {
      key: 'caseType',
      label: 'Case Type',
      type: 'input',
      placeholder: 'Enter Case Type',
    },
    {
      key: 'state',
      label: 'State/UT',
      type: 'select',
      options: 'STATE_OPTIONS',
      placeholder: 'Select State/UT',
    },
  ],
  'Party Name and Address': [
    {
      key: 'personName',
      label: 'Name',
      type: 'input',
      placeholder: 'Enter full name of Petitioner/Respondent',
    },
    {
      key: 'state',
      label: 'State/UT',
      type: 'select',
      options: 'STATE_OPTIONS',
      placeholder: 'Select State/UT',
    },
    {
      key: 'district',
      label: 'District',
      type: 'select',
      options: 'DISTRICT_OPTIONS',
      placeholder: 'Select district',
      disabled: true, // Will be enabled when state is selected
    },
  ],
  'Section Wise': [
    {
      key: 'legalSection',
      label: 'Section',
      type: 'input',
      placeholder: 'Enter Legal Section',
    },
    {
      key: 'state',
      label: 'State/UT',
      type: 'select',
      options: 'STATE_OPTIONS',
      placeholder: 'Select State/UT',
    },
  ],
  'Case / CNR No.': [
    {
      key: 'caseNumber',
      label: 'Case / CNR Number',
      type: 'input',
      placeholder: 'Enter case or CNR number (e.g., CR-1234/2023)',
    },
  ],
  'Advocate Name': [
    {
      key: 'advocateName',
      label: 'Name',
      type: 'input',
      placeholder: 'Enter advocate name',
    },
    {
      key: 'advocateOnRecordNumber',
      label: 'Advocate On Record Number',
      type: 'input',
      placeholder: 'Enter advocate on record number',
    },
  ],
  'Judge Name': [
    {
      key: 'judgeName',
      label: 'Name',
      type: 'input',
      placeholder: 'Enter judge name (e.g., Justice John Doe)',
    },
    {
      key: 'courtName',
      label: 'Court',
      type: 'input',
      placeholder: 'Enter Court Name',
    },
  ],
  'Case Type': [
    {
      key: 'detailedCaseType',
      label: 'Case Type',
      type: 'input',
      placeholder: 'Enter Case Type (e.g., OA, SA, MACT)',
    },
    {
      key: 'courtName',
      label: 'Court Name',
      type: 'input',
      placeholder: 'Enter Court Name',
    },
    {
      key: 'state',
      label: 'State/UT',
      type: 'select',
      options: 'STATE_OPTIONS',
      placeholder: 'Select State/UT',
    },
    {
      key: 'filingYear',
      label: 'Filing Year',
      type: 'input',
      placeholder: 'Enter year (e.g., 2023)',
    },
  ],
} as const

// Risk level mappings
export const RISK_COLOR_MAP: Record<RiskLevel, 'green' | 'yellow' | 'red'> = {
  low: 'green',
  medium: 'yellow',
  high: 'red',
}

export const RISK_LABEL_MAP: Record<RiskLevel, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
}

// Common text content
export const TEXT_CONTENT = {
  header: {
    title: 'Legal Data Discovery',
    subtitle: 'Search and explore case data, legal documents, and precedents',
  },
  searchForm: {
    aadhaarLabel: 'Aadhaar Number',
    aadhaarPlaceholder: 'Enter Aadhaar number (e.g., 1234 5678 9012)',
    aadhaarHelper: 'Enter 12-digit Aadhaar number',
    verificationTypeLabel: 'Verification Type',
    caseCategoryLabel: 'Case Category',
    associatedEntityLabel: 'Associated Entity',
    associatedEntityPlaceholder: 'Bank, Government Agency, Service Provider',
    stateLabel: 'State/UT',
    searchButton: 'Search',
    saveQueryButton: 'Save Query',
  },
  filters: {
    title: 'Filters',
    clearAll: 'Clear All',
    dateRange: 'Date Range',
    from: 'From',
    to: 'To',
    riskScore: 'Risk Score',
    applyFilters: 'Apply Filters',
  },
  searchResults: {
    title: 'Search Results',
    resultsCount: '0 results found',
    helpButton: 'Help',
    courtLabel: 'Court:',
    judgeLabel: 'Judge:',
    locationLabel: 'Location:',
  },
}
