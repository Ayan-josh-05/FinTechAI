import { buildSearchParams } from '@/utils/urlParams'

export const getBreadcrumbItems = (
  judgeId: string,
  queryId?: string,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    legalAct?: string;
    riskScore?: string;
    verificationStatus?: string;
  },
  judgeName?: string
) => {
  const searchParams = buildSearchParams({
    query_id: queryId,
    filters
  });

  const searchHref = searchParams.toString()
    ? `/legal-data-discovery?${searchParams.toString()}`
    : "/legal-data-discovery";

  return [
    { label: "Legal Data Discovery", href: "/legal-data-discovery" },
    { label: "Search", href: searchHref },
    { label: `Judge Profile - ${judgeName || judgeId}`, isCurrentPage: true }
  ];
};
