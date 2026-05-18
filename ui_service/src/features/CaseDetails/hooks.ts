import { useQuery } from '@tanstack/react-query';
import * as Sentry from '@sentry/tanstackstart-react';
import { fetchCaseDetails } from './api';

/**
 * Hook for fetching case details
 */
export const useCaseDetails = (caseId: string) => {
  return useQuery({
    queryKey: ['case-details', caseId],
    queryFn: ({ queryKey }) => {
      const [, id] = queryKey;
      return Sentry.startSpan({ name: 'Fetching case details by ID' }, async () => {
        return fetchCaseDetails(id);
      });
    },
    enabled: !!caseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
