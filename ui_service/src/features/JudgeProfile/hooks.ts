import { useQuery } from '@tanstack/react-query';
import * as Sentry from '@sentry/tanstackstart-react';
import { fetchJudgeDetails } from './api';

/**
 * Hook for fetching judge details
 */
export const useJudgeDetails = (judgeId: string) => {
  return useQuery({
    queryKey: ['judge-details', judgeId],
    queryFn: ({ queryKey }) => {
      const [, id] = queryKey;
      return Sentry.startSpan({ name: 'Fetching judge details by ID' }, async () => {
        return fetchJudgeDetails(id);
      });
    },
    enabled: !!judgeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
