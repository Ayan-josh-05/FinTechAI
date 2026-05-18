// src/features/OrganizationDetails/api.ts
import * as Sentry from '@sentry/tanstackstart-react'
import type { OrganizationDetails, Organization, LegalCase, LegalActivity } from './types'
import api from '@/integrations/axiosInterceptor'

export const fetchOrganizationDetails = async (orgId: string): Promise<OrganizationDetails> => {
  return Sentry.startSpan({ name: 'Fetching organization details' }, async () => {
    const response = await api.get(`/entity/organization/${orgId}`)
    return response.data
  })
}

// Legacy mock data functions for backward compatibility
const mockOrganization: Organization = {
  id: '1',
  name: 'TechCorp Solutions Pvt. Ltd.',
  type: 'Private Limited Company',
  registrationNumber: 'U72900DL2015PTC278945',
  dateOfIncorporation: '2015-03-15',
  website: 'www.techcorpsolutions.com',
  registeredAt: 'Registrar of Companies, Delhi',
  contactInformation: {
    phone: '+91-11-4567-8900',
    email: 'contact@techcorpsolutions.com'
  },
  address: 'Block A, Sector 62, Noida, Uttar Pradesh - 201309, India',
  lastUpdated: '2024-04-25',
  status: 'Active',
  companyType: 'Private Limited',
  legalIdentifiers: {
    cin: 'U72900DL2015PTC278945',
    pan: 'AABCT1234C',
    gstin: '07AABCT1234C1ZX'
  },
  summary: {
    yearsInBusiness: 9,
    activeCases: 0,
    closedCases: 3
  }
};

const mockLegalCases = [
  {
    id: '1',
    title: 'Contract Dispute - ABC Suppliers',
    description: 'Commercial dispute regarding delayed payments and contract terms.',
    year: '2019',
    status: 'Resolved - Settled',
    type: "success"
  },
  {
    id: '2',
    title: 'Employment Tribunal - Former Employee',
    description: 'Wrongful termination claim filed by former senior developer.',
    year: '2020',
    status: 'Dismissed',
    type: "medium"
  },
  {
    id: '3',
    title: 'Intellectual Property Dispute',
    description: 'Patent infringement claim regarding software algorithm.',
    year: '2021',
    status: 'Settled Out of Court',
    type: "review"
  }
];

const mockLegalActivities = [
  {
    id: '1',
    title: 'Annual Filing - Form AOC-4',
    description: 'Annual return filed with the Ministry of Corporate Affairs for FY 2023-24.',
    date: '2024-03',
    status: 'Filed',
    type: 'medium'
  },
  {
    id: '2',
    title: 'GST Return Filing - GSTR-3B',
    description: 'Monthly GST return filed for the period of January 2024.',
    date: '2024-02',
    status: 'Filed',
    type: 'medium'
  },
  {
    id: '3',
    title: 'Board Resolution - Capital Increase',
    description: 'Board resolution passed for increasing authorized share capital from ₹10 lakh to ₹50 lakh.',
    date: '2024-01',
    status: 'Resolution',
    type: 'success'
  }
];

export const getOrganizationDetails = async (_id: string): Promise<Organization> => {
  return mockOrganization;
};

export const getOrganizationLegalCases = async (_id: string): Promise<LegalCase[]> => {
  return mockLegalCases;
};

export const getOrganizationLegalActivities = async (_id: string): Promise<LegalActivity[]> => {
  return mockLegalActivities;
};
