export const getBreadcrumbItems = (lawyerId: string, lawyerName?: string, searchId?: string) => [
  { label: "Legal Data Discovery", href: "/legal-data-discovery" },
  { label: "Search", href: searchId ? `/legal-data-discovery?query_id=${searchId}` : "/legal-data-discovery" },
  { label: lawyerName || `Lawyer ${lawyerId}`, isCurrentPage: true }
];

export const lawyerData = {
  name: 'Adv. Priya Sharma',
  title: 'Senior Advocate - Supreme Court of India',
  firm: 'Sharma & Associates',
  status: [{ text: 'Active', type: 'active', rounded: true }],
  experience: '18 years',
  image: '/placeholder.svg',
  specialization: 'Tax Law & Financial Crimes',
  barRegistration: "MH/2156/1998",
  successRate: "87%",
  areasOfPractice: [
    'Tax Law',
    'Financial Crimes',
    'Corporate Law',
    'Banking Law',
    'Securities Law',
    'Money Laundering',
    'White Collar Crimes',
    'Constitutional Law',
  ],
  recentCases: [
    {
      title: 'State vs. Kumar Industries Ltd',
      description:
        'Successfully defended against ₹50 crore tax evasion charges with complete acquittal.',
      court: 'Bombay High Court',
      concluded: 'Feb 2024',
      status: [{ text: 'Won', type: 'success' }],
      category: [{ text: 'Tax Evasion', type: 'info' }],
    },
    {
      title: 'RBI vs. Phoenix Financial Services',
      description:
        'Representing NBFC in regulatory compliance matter involving digital lending practices.',
      court: 'Supreme Court',
      filed: 'Jan 2024',
      status: [{ text: 'Ongoing', type: 'warning' }],
      category: [{ text: 'Banking', type: 'info' }],
    },
    {
      title: 'ED vs. Sharma Trading Pvt Ltd',
      description:
        'Successfully challenged attachment orders under PMLA, assets worth ₹25 crores released.',
      court: 'Delhi High Court',
      concluded: 'Dec 2023',
      status: [{ text: 'Won', type: 'success' }],
      category: [{ text: 'PMLA', type: 'warning' }],
    },
    {
      title: 'CBI vs. Metropolitan Bank',
      description:
        'Defended bank officials in loan fraud case, secured bail for all accused parties.',
      court: 'CBI Special Court',
      concluded: 'Nov 2023',
      status: [{ text: 'Partial', type: 'info' }],
      category: [{ text: 'Fraud', type: 'warning' }],
    },
  ],
  associatedCourts: [
    {
      name: 'Supreme Court of India',
      role: 'Senior Advocate',
      status: [{ text: 'Active', type: 'active' }],
    },
    {
      name: 'Bombay High Court',
      role: 'Regular Practice',
      status: [{ text: 'Active', type: 'active' }],
    },
    {
      name: 'Delhi High Court',
      role: 'Occasional',
      status: [{ text: 'Active', type: 'active' }],
    },
    {
      name: 'ITAT Mumbai',
      role: 'Specialized',
      status: [{ text: 'Active', type: 'active' }],
    },
  ],
  professionalStats: {
    casesWon: 156,
    totalCases: 189,
    winRate: 82.5,
    activeCases: 12,
  },
}