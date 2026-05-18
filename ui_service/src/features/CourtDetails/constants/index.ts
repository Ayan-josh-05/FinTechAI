// Court Details constants
export const COURT_DETAILS_TEXT = {
  header: {
    title: 'Income Tax Appellate Tribunal',
    saveToQuery: 'Save to Query',
    exportData: 'Export Data',
  },
  breadcrumb: {
    legalDiscovery: 'Legal Discovery',
    courts: 'Courts',
    currentCourt: 'Income Tax Appellate Tribunal',
  },
  courtInfo: {
    courtCode: 'Court Code:',
    established: 'Established:',
    jurisdiction: 'Jurisdiction:',
  },
  statistics: {
    totalCases: 'Total Cases',
    openCases: 'Open Cases',
    closedCases: 'Closed Cases',
  },
  tooltips: {
    totalCases: 'Shows the total count of cases that are being tracked',
    openCases: 'Shows the count of cases that are still under review or awaiting resolution.',
    closedCases: 'Shows the count of cases that have been resolved or closed.',
  },
  sections: {
    courtOverview: 'Court Overview',
    caseStatusDistribution: 'Case Status Distribution',
    caseTypes: 'Case Types',
    caseStatistics: 'Case Statistics',
    courtLocation: 'Court Location',
    judgesRoster: 'Associated Judges',
  },
  location: {
    buildingName: 'ITAT Building',
  },
  judge: {
    experience: 'Experience:',
    specialization: 'Specialization:',
    activeCases: 'Active Cases:',
    courtRoom: 'Court:',
  },
} as const

export const getBreadcrumbItems = (
  courtId: string,
  courtName?: string,
  queryId?: string,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    legalAct?: string;
    riskScore?: string;
    verificationStatus?: string;
  }
) => {
  const searchParams = new URLSearchParams();

  if (queryId) {
    searchParams.set('query_id', queryId);
  }
  if (filters?.dateFrom) {
    searchParams.set('dateFrom', filters.dateFrom);
  }
  if (filters?.dateTo) {
    searchParams.set('dateTo', filters.dateTo);
  }
  if (filters?.legalAct) {
    searchParams.set('legalAct', filters.legalAct);
  }
  if (filters?.riskScore) {
    searchParams.set('riskScore', filters.riskScore);
  }
  if (filters?.verificationStatus) {
    searchParams.set('verificationStatus', filters.verificationStatus);
  }

  const searchHref = searchParams.toString()
    ? `/legal-data-discovery?${searchParams.toString()}`
    : "/legal-data-discovery";

  return [
    { label: "Legal Data Discovery", href: "/legal-data-discovery" },
    { label: "Search", href: searchHref },
    { label: courtName || `Court ${courtId}`, isCurrentPage: true }
  ];
};

// Mock data constants
export const COURT_DETAILS_DATA = {
  courtInfo: {
    code: 'ITAT-MUM-001',
    established: '1976',
    jurisdiction: 'Mumbai & Thane',
  },
  statistics: {
    totalCases: 2847,
    openCases: 1234,
    closedCases: 1613,
  },
  overview: 'The Income Tax Appellate Tribunal (ITAT) Mumbai is a specialized quasi-judicial institution that hears appeals against orders of income tax authorities. Established under the Income Tax Act, 1961, it serves as the final fact-finding authority in tax matters and handles complex cases involving tax evasion, assessment disputes, and penalty proceedings.',
  location: {
    name: 'ITAT Building',
    address: [
      '4th Floor, Aayakar Bhavan',
      'M.K. Road, Mumbai - 400020',
      'Maharashtra, India',
    ],
  },
  judges: [
    {
      name: 'Hon. Justice Rajesh Kumar',
      position: 'Presiding Officer',
      experience: '18 years',
      specialization: 'Tax Law',
      activeCases: 127,
      courtRoom: 'Room 204',
      status: [{ text: 'Active', type: 'active' }],
    },
    {
      name: 'Hon. Justice Priya Sharma',
      position: 'Judicial Member',
      experience: '15 years',
      specialization: 'Corporate Tax',
      activeCases: 98,
      courtRoom: 'Room 206',
      status: [{ text: 'Active', type: 'active' }],
    },
    {
      name: 'Hon. Amit Gupta',
      position: 'Accountant Member',
      experience: '22 years',
      specialization: 'Financial Audits',
      activeCases: 45,
      courtRoom: 'Room 208',
      status: [{ text: 'On Leave', type: 'warning' }],
    },
  ],
  caseStatusData: [
    {
      label: 'Pending Hearing',
      value: 556,
      color: 'orange',
      percentage: 45
    },
    {
      label: 'Under Review',
      value: 432,
      color: 'blue',
      percentage: 35
    },
    {
      label: 'Judgment Reserved',
      value: 246,
      color: 'yellow',
      percentage: 20
    },
  ],
  caseTypes: [
    { label: 'Tax Evasion', value: 1245 },
    { label: 'Assessment Appeals', value: 892 },
    { label: 'Penalty Disputes', value: 567 },
    { label: 'TDS Issues', value: 143 },
  ],
}

// Status options
export const COURT_STATUS_OPTIONS = [
  'Active',
  'Inactive',
  'On Leave',
  'District Court',
  'High Court',
  'Supreme Court',
] as const

export type CourtStatus = typeof COURT_STATUS_OPTIONS[number]

// Badge color constants for Chakra UI
export const STATUS_BADGE_COLORS = {
  Active: {
    bg: '#DCFCE7',
    color: '#166534',
  },
  'District Court': {
    bg: '#DBEAFE',
    color: '#5B53B9',
  },
  'On Leave': {
    bg: '#FEF9C3',
    color: '#855848',
  },
  Inactive: {
    bg: '#FEE2E2',
    color: '#991B1B',
  },
  'High Court': {
    bg: '#E0E7FF',
    color: '#3730A3',
  },
  'Supreme Court': {
    bg: '#F1F5F9',
    color: '#0F172A',
  },
  'Pending': {
    bg: '#FFEDD5',
    color: '#9A3412',
  },
  'Under Review': {
    bg: '#DBEAFE',
    color: '#1E40AF',
  },
  'Judgment Reserved': {
    bg: '#FEF9C3',
    color: '#854D0E',
  },
} as const

export type StatusBadgeColor = keyof typeof STATUS_BADGE_COLORS