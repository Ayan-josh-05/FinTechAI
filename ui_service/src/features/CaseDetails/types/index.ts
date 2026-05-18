export interface TimelineEvent {
  title: string;
  description: string;
  date: string;
  status: 'completed' | 'upcoming' | 'in-progress';
}

export interface CaseDocument {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedBy?: string;
  uploadedAt?: string;
  url?: string;
}

export interface InvolvedParty {
  type: 'Individual' | 'Company' | 'Government' | 'Other';
  name: string;
  role: string;
  entity_id?: string;
  identificationNumber?: Array<{
    type: string;
    value: string;
  }>;
  address?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
  };
  statusBadge: Array<{
    type: string;
    text: string;
  }>
}

export interface InvolvedLawyer {
  name: string;
  lawyer_id: string;
  bar_number: string;
  specialization: string;
}

export interface LegalSectionsMap {
  [act: string]: Array<string>;
}

export interface Judge {
  name: string | null;
  judge_id: string | null;
}

export interface CourtDetails {
  name: string;
  court_id: string;
  location: string;
  room?: string;
  judge: Judge | Array<Judge> | null;
  jurisdiction?: string;
}

export interface CaseStatus {
  stage: string;
  nextAction: string;
  expectedDuration: string;
  nextHearingDate?: string;
}

export interface CaseSummary {
  description: string;
  allegedAmount?: string;
  casePeriod?: string;
  keyIssues?: Array<string>;
}

export interface CaseDetails {
  id: string;
  title: string;
  caseNumber: string;
  cnrNumber?: string;
  filingDate: string;
  riskScore: string;
  status: Array<{ text: string, type: string }>;
  summary: CaseSummary;
  involvedParties: Array<InvolvedParty>;
  involveLawyers: Array<InvolvedLawyer>;
  timeline: Array<TimelineEvent>;
  documents: Array<CaseDocument>;
  legalSections: LegalSectionsMap;
  court: CourtDetails;
  currentStatus: CaseStatus;
  financialSummary: string | null;
}
