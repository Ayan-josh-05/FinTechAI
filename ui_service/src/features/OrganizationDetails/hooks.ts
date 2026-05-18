// src/features/OrganizationDetails/hooks.ts
import { useQuery } from '@tanstack/react-query'
import {
  fetchOrganizationDetails,
  getOrganizationDetails,
  getOrganizationLegalCases,
  getOrganizationLegalActivities
} from './api'
import type { OrganizationDetails, Organization, LegalCase, LegalActivity } from './types'

// Main hook for fetching organization details from the API
export const useOrganizationDetailsAPI = (orgId: string) => {
  return useQuery<OrganizationDetails, Error>({
    queryKey: ['organizationDetails', orgId],
    queryFn: () => fetchOrganizationDetails(orgId),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Legacy hooks for backward compatibility
export const useOrganizationDetails = (id: string) => {
  return useQuery<Organization>({
    queryKey: ['organization', id],
    queryFn: () => getOrganizationDetails(id)
  });
};

export const useOrganizationLegalCases = (id: string) => {
  return useQuery<LegalCase[]>({
    queryKey: ['organization-legal-cases', id],
    queryFn: () => getOrganizationLegalCases(id)
  });
};

export const useOrganizationLegalActivities = (id: string) => {
  return useQuery<LegalActivity[]>({
    queryKey: ['organization-legal-activities', id],
    queryFn: () => getOrganizationLegalActivities(id)
  });
};
