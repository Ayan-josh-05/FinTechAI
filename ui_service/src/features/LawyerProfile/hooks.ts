import { useQuery } from '@tanstack/react-query';
import * as Sentry from '@sentry/tanstackstart-react';
import { fetchLawyerDetails } from './api';

/**
 * Hook for fetching lawyer details
 */
export const useLawyerDetails = (lawyerId: string) => {
  return useQuery({
    queryKey: ['lawyer-details', lawyerId],
    queryFn: ({ queryKey }) => {
      const [, id] = queryKey;
      return Sentry.startSpan({ name: 'Fetching lawyer details by ID' }, async () => {
        return fetchLawyerDetails(id);
      });
    },
    enabled: !!lawyerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
