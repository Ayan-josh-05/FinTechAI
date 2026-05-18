// src/features/UserDetails/hooks.ts
import { useQuery } from '@tanstack/react-query'
import { fetchUserDetails } from './api'
import type { UserDetails } from './types/types'

export const useUserDetails = (userId: string) => {
  return useQuery<UserDetails, Error>({
    queryKey: ['userDetails', userId],
    queryFn: () => fetchUserDetails(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Utility hook to transform user details into header format
export const useUserDetailsHeader = (userId: string) => {
  const { data: userDetails, isLoading, error } = useUserDetails(userId)

  const headerData = userDetails ? {
    title: userDetails.fullName,
    statusBadges: userDetails.status,
    headerInfo: [
      // { label: 'Registration Date:', value: userDetails.registrationDate },
    ],
    profileImage: userDetails.profileImage,
  } : null

  return {
    headerData,
    isLoading,
    error,
  }
}
