export interface LawyerData {
  name: string;
  title: string;
  firm: string;
  status: Array<{ text: string; type: string; rounded?: boolean }>;
  experience: string;
  image: string;
  specialization: string;
  barRegistration: string;
  successRate: string;
  areasOfPractice: Array<string>;
  recentCases: Array<{
    case_id: string;
    court_id: string;
    title: string;
    description: string;
    court: string;
    concluded?: string;
    filed?: string;
    status: Array<{ text: string; type: string }>;
    category: Array<{ text: string; type: string }>;
  }>;
  associatedCourts: Array<{
    name: string;
    role: string;
    status: Array<{ text: string; type: string }>;
  }>;
  professionalStats: {
    casesWon: number;
    totalCases: number;
    winRate: number;
    activeCases: number;
  };
}
