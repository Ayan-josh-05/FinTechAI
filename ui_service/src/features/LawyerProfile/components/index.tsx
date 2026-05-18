import { useMemo } from 'react'
import { Grid, GridItem, VStack } from '@chakra-ui/react'
import { FaBookmark } from 'react-icons/fa'
import { useParams, useSearch } from '@tanstack/react-router'

import { useLawyerDetails } from '../hooks'
import RecentCases from './RecentCases'
import AreasOfPractice from './AreasOfPractice'
import AssociatedCourts from './AssociatedCourts'
import ProfessionalStats from './ProfessionalStats'
import LawyerProfileSkeleton from './LawyerProfileSkeleton'
import type { EntityAction } from '@/features/shared/components'
import { EntityNotFound } from '@/features/shared/components'
import { buildDynamicBreadcrumbs } from '@/utils/breadcrumbUtils'

import EntityPageLayout from '@/features/shared/layout/EntityPageLayout'
import DownloadIcon from '@/features/shared/icons/DownloadIcon'

const LawyerProfile = () => {
  const { lawyerId } = useParams({ from: '/lawyer-profile/$lawyerId' })
  const search = useSearch({ from: '/lawyer-profile/$lawyerId' })
  const { data: lawyerData, isLoading, error } = useLawyerDetails(lawyerId)

  // Create info items for EntityHeader
  const infoItems = useMemo(() => {
    if (!lawyerData) return []
    return [
      { label: 'BAR NO.:', value: lawyerData.barRegistration },
      { label: 'Experience:', value: lawyerData.experience },
      {
        label: 'Success Rate:',
        value: lawyerData.successRate,
      },
    ]
  }, [lawyerData])

  const headerActions: Array<EntityAction> = useMemo(
    () => [
      {
        label: 'Save Case',
        variant: 'primary',
        icon: <FaBookmark size={10} />,
        onClick: () => console.log('Save case clicked'),
        isDisabled: true,
      },
      {
        label: 'Export',
        variant: 'outline',
        icon: <DownloadIcon size={16} />,
        onClick: () => console.log('Export clicked'),
        isDisabled: true,
      },
    ],
    [],
  )

  const layoutChildrens = useMemo(() => {
    if (!lawyerData) return null

    return (
      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
        {/* Left column */}
        <GridItem>
          <VStack gap={6} align="stretch">
            <AreasOfPractice data={lawyerData.areasOfPractice} />
            <RecentCases data={lawyerData.recentCases} />
          </VStack>
        </GridItem>

        {/* Right column */}
        <GridItem>
          <VStack gap={6} align="stretch">
            <AssociatedCourts data={lawyerData.associatedCourts} />
            <ProfessionalStats data={lawyerData.professionalStats} />
          </VStack>
        </GridItem>
      </Grid>
    )
  }, [lawyerData])

  const headerProps = useMemo(() => {
    if (!lawyerData) return {}
    return {
      infoItems: infoItems,
      statusBadges: lawyerData.status,
      title: lawyerData.name,
      actions: headerActions,
    }
  }, [lawyerData, infoItems, headerActions])

  // Build dynamic breadcrumbs based on navigation context
  const breadcrumbItems = useMemo(() => {
    return buildDynamicBreadcrumbs({
      queryId: (search as any).query_id,
      filters: {
        dateFrom: (search as any).dateFrom,
        dateTo: (search as any).dateTo,
        legalAct: (search as any).legalAct,
        riskScore: (search as any).riskScore,
        verificationStatus: (search as any).verificationStatus,
      },
      // Case context (if coming from case details)
      caseId: (search as any).caseId,
      caseNumber: (search as any).caseNumber,
      // Judge context (if coming from judge profile)
      judgeId: (search as any).judgeId,
      judgeName: (search as any).judgeName,
      // Court context (if coming from court details)
      courtId: (search as any).courtId,
      courtName: (search as any).courtName,
      // Lawyer context
      lawyerId,
      lawyerName: lawyerData?.name,
      // Current page type
      currentPageType: 'lawyer',
    })
  }, [search, lawyerId, lawyerData?.name])

  // Show skeleton while loading
  if (isLoading) {
    return <LawyerProfileSkeleton lawyerId={lawyerId} />
  }

  // Show error state if there's an error
  if (error || !lawyerData) {
    return (
      <EntityNotFound entityType="Lawyer" breadcrumbItems={breadcrumbItems} />
    )
  }

  return (
    <EntityPageLayout
      children={layoutChildrens}
      breadcrumbItems={breadcrumbItems}
      headerProps={headerProps}
    />
  )
}

export default LawyerProfile
