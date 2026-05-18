
export const getBreadcrumbItems = (
  caseId: string,
  queryId?: string,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    legalAct?: string;
    riskScore?: string;
    verificationStatus?: string;
  },
  judgeId?: string,
  judgeName?: string,
  caseNumber?: string
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

  const breadcrumbs = [
    { label: "Legal Data Discovery", href: "/legal-data-discovery" },
    { label: "Search", href: searchHref }
  ];

  // Add judge profile link if we have judge context
  if (judgeId && judgeName) {
    const judgeSearchParams = new URLSearchParams(searchParams);
    judgeSearchParams.set('judgeId', judgeId);
    judgeSearchParams.set('judgeName', judgeName);

    const judgeHref = `/judge-profile/${judgeId}?${judgeSearchParams.toString()}`;
    breadcrumbs.push({
      label: `Judge Profile - ${judgeName}`,
      href: judgeHref
    });
  }

  // Add case details as current page
  breadcrumbs.push({
    label: `Case Details - ${caseNumber || caseId}`,
    isCurrentPage: true
  } as any);

  return breadcrumbs;
};

