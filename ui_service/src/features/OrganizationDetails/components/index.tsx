import { useMemo } from 'react'
import { useParams, useSearch } from '@tanstack/react-router'
import { Center, Grid, GridItem, Spinner, VStack } from '@chakra-ui/react'

import { useOrganizationDetailsAPI } from '../hooks'
import { ActiveLegalCases } from './ActiveLegalCases'
import { BasicInformation } from './BasicInformation'
import { LegalIdentifiers } from './LegalIdentifiers'
import OrganizationSummary from './OrganizationSummary'
import { PastLegalCases } from './PastLegalCases'
import type { EntityAction } from '@/features/shared/components'
import { EntityNotFound } from '@/features/shared/components'
import DownloadIcon from '@/features/shared/icons/DownloadIcon'
import EntityPageLayout from '@/features/shared/layout/EntityPageLayout'
import { buildDynamicBreadcrumbs } from '@/utils/breadcrumbUtils'

const OrganizationDetails = () => {
  const { id } = useParams({ from: '/organization/$id' })
  const search = useSearch({ from: '/organization/$id' })
  const { data: orgDetails, isLoading, error } = useOrganizationDetailsAPI(id)

  const headerActions: Array<EntityAction> = useMemo(
    () => [
      {
        label: 'Export Data',
        variant: 'outline',
        icon: <DownloadIcon size={16} />,
        onClick: () => console.log('Export Data clicked'),
        isDisabled: false,
      },
    ],
    [],
  )

  const headerProps = useMemo(() => {
    if (!orgDetails) return {}
    return {
      title: orgDetails.basicInfo.name,
      statusBadges: [orgDetails.basicInfo.organizationType],
      actions: headerActions,
      infoItems: [
        {
          label: 'Registered At',
          value: orgDetails.basicInfo.registeredAt,
        },
      ],
    }
  }, [orgDetails, headerActions])

  const layoutChildren = useMemo(() => {
    if (!orgDetails) return null

    return (
      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
        {/* Left column */}
        <GridItem>
          <VStack gap={6} align="stretch">
            <BasicInformation basicInfo={orgDetails.basicInfo} />
            <LegalIdentifiers legalIdentifiers={orgDetails.legalIdentifiers} />
            <ActiveLegalCases cases={orgDetails.activeLegalCases} />
            <PastLegalCases cases={orgDetails.pastLegalCases} />
          </VStack>
        </GridItem>

        {/* Right column */}
        <GridItem>
          <VStack gap={6} align="stretch">
            <OrganizationSummary summary={orgDetails.organizationSummary} />
          </VStack>
        </GridItem>
      </Grid>
    )
  }, [orgDetails])

  const breadcrumbItems = useMemo(() => {
    return buildDynamicBreadcrumbs({
      queryId: search.query_id,
      filters: {
        dateFrom: search.dateFrom,
        dateTo: search.dateTo,
        legalAct: search.legalAct,
        riskScore: search.riskScore,
        verificationStatus: search.verificationStatus,
      },
      // Pass case context if available (when navigating from case details)
      caseId: search.caseId,
      caseNumber: search.caseNumber,
      // Pass judge context if available
      judgeId: search.judgeId,
      judgeName: search.judgeName,
      // Pass court context if available
      courtId: search.courtId,
      courtName: search.courtName,
      // Pass lawyer context if available
      lawyerId: search.lawyerId,
      lawyerName: search.lawyerName,
      currentPageType: 'organization',
      organizationId: id,
      organizationName: orgDetails?.basicInfo.name,
    })
  }, [search, id, orgDetails?.basicInfo.name])

  if (isLoading) {
    return (
      <Center h="400px">
        <Spinner size="xl" />
      </Center>
    )
  }

  if (error || !orgDetails) {
    return (
      <EntityNotFound
        entityType="Organization"
        breadcrumbItems={breadcrumbItems}
      />
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

export default OrganizationDetails