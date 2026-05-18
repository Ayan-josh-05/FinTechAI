// src/features/user-details/pages/UserDetails.tsx
import { useMemo } from 'react'
import { Box, Grid, GridItem, Spinner, VStack } from '@chakra-ui/react'
import { useParams, useSearch } from '@tanstack/react-router'

// sections
import PersonalInformation from '../components/PersonalInformation'
import IdentityDocuments from '../components/IdentityDocuments'
import AddressInformation from '../components/AddressInformation'
import ActiveLegalCases from '../components/ActiveLegalCases'
import AccountStatus from '../components/AccountStatus'
import PastLegalCases from '../components/PastLegalCases'
// import LegalInteractions from '../components/LegalInteractions'
import { useUserDetails, useUserDetailsHeader } from '../hooks'
import type { EntityAction } from '@/features/shared/components/EntityHeader'
import { EntityNotFound } from '@/features/shared/components'
import { buildDynamicBreadcrumbs } from '@/utils/breadcrumbUtils'
import EntityPageLayout from '@/features/shared/layout/EntityPageLayout'
import { DownloadIcon } from '@/features/shared/icons/DownloadIcon'

const UserDetails = () => {
  const { userId } = useParams({ from: '/user-details/$userId' })
  const search = useSearch({ from: '/user-details/$userId' })
  const { data: userDetails, isLoading, error } = useUserDetails(userId)
  const { headerData } = useUserDetailsHeader(userId)

  // header actions
  const headerActions: Array<EntityAction> = useMemo(
    () => [
      {
        label: 'Export Data',
        variant: 'outline',
        icon: <DownloadIcon size={16} />,
        onClick: () => console.log('Export Data clicked'),
        isDisabled: true,
      },
    ],
    [],
  )

  // children under the header (two-column layout like Case Details)
  const layoutChildren = useMemo(() => {
    if (!userDetails) return null

    return (
      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
        {/* Left column */}
        <GridItem>
          <VStack gap={6} align="stretch">
            <PersonalInformation userDetails={userDetails} />
            <IdentityDocuments userDetails={userDetails} />
            <AddressInformation userDetails={userDetails} />
            <ActiveLegalCases userDetails={userDetails} />
            <PastLegalCases userDetails={userDetails} />
            {/* <LegalInteractions userDetails={userDetails} /> */}
          </VStack>
        </GridItem>

        {/* Right column */}
        <GridItem>
          <VStack gap={6} align="stretch">
            <AccountStatus userDetails={userDetails} />
          </VStack>
        </GridItem>
      </Grid>
    )
  }, [userDetails])

  const headerProps = useMemo(() => {
    if (!headerData) return {}

    return {
      title: headerData.title,
      statusBadges: headerData.statusBadges,
      infoItems: headerData.headerInfo,
      actions: headerActions,
      useInitials: true, // Always use initials for user details
    }
  }, [headerData, headerActions])

  // Build dynamic breadcrumbs based on navigation context
  const breadcrumbItems = useMemo(() => {
    const searchParams = search as any // Type assertion for search parameters
    return buildDynamicBreadcrumbs({
      queryId: searchParams.query_id,
      filters: {
        dateFrom: searchParams.dateFrom,
        dateTo: searchParams.dateTo,
        legalAct: searchParams.legalAct,
        riskScore: searchParams.riskScore,
        verificationStatus: searchParams.verificationStatus,
      },
      // Case context (if coming from case details)
      caseId: searchParams.caseId,
      caseNumber: searchParams.caseNumber,
      // Judge context (if coming from judge profile)
      judgeId: searchParams.judgeId,
      judgeName: searchParams.judgeName,
      // Court context (if coming from court details)
      courtId: searchParams.courtId,
      courtName: searchParams.courtName,
      // Lawyer context (if coming from lawyer profile)
      lawyerId: searchParams.lawyerId,
      lawyerName: searchParams.lawyerName,
      // Party context
      partyId: userId,
      partyName: userDetails?.fullName || searchParams.partyName,
      // Current page type
      currentPageType: 'party',
    })
  }, [search, userId, userDetails?.fullName])

  // Loading state
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minH="400px"
      >
        <Spinner size="xl" color="blue.500" />
      </Box>
    )
  }

  // Error state or no data state
  if (error || !userDetails || !headerData) {
    return (
      <EntityNotFound entityType="User" breadcrumbItems={breadcrumbItems} />
    )
  }

  return (
    <EntityPageLayout
      breadcrumbItems={breadcrumbItems}
      headerProps={headerProps}
      children={layoutChildren}
    />
  )
}

export default UserDetails
