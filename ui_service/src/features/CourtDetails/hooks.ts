import { useQuery } from '@tanstack/react-query';
import * as Sentry from '@sentry/tanstackstart-react';
import { fetchCourtDetails } from './api';

/**
 * Hook for fetching court details
 */
export const useCourtDetails = (courtId: string) => {
  return useQuery({
    queryKey: ['court-details', courtId],
    queryFn: ({ queryKey }) => {
      const [, id] = queryKey;
      return Sentry.startSpan({ name: 'Fetching court details by ID' }, async () => {
        return fetchCourtDetails(id);
      });
    },
    enabled: !!courtId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
