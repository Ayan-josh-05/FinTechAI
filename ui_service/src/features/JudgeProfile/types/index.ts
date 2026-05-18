export interface JudgeData {
  name: string;
  title: string;
  court: string;
  status: Array<{ text: string; type: string }>;
  experience: string;
  image: string;
  barRegistration: string;
  successRate: string;
  professionalBackground: {
    education: Array<string>;
    careerTimeline: Array<{
      position: string;
      period: string;
      status: string;
    }>;
  };
  areasOfSpecialization: {
    primary: Array<string>;
    secondary: Array<string>;
  };
  notableJudgments: Array<{
    title: string;
    description: string;
    date: string;
    case_id: string;
    case_number: string;
    status: Array<{ text: string; type: string }>;
  }>;
  recentHearings: Array<{
    caseNumber: string;
    date: string;
    type: string;
    status: Array<{ text: string; type: string }>;
  }>;
  caseStatistics: {
    totalCasesHandled: number;
    thisYear: number;
    pendingCases: number;
    disposalRate: number;
  };
  caseDistribution: Array<{
    category: string;
    percentage: number;
    color: string;
  }>;
}
