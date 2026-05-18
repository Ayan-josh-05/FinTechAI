import { useQuery } from '@tanstack/react-query';
import type { GetCurrentUserResponse } from '@/features/Auth/api';
import { getCurrentUser } from '@/features/Auth/api';

/**
 * Hook to fetch current user data from /me endpoint
 */
export const useUserProfile = () => {
  return useQuery<GetCurrentUserResponse, Error>({
    queryKey: ['user-profile'],
    queryFn: () => getCurrentUser(false), // Don't show error notifications for this query
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Disable retries to prevent multiple calls
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: true, // Allow refetch on component mount to get fresh data
  });
};
