import { useMemo } from 'react'
import { Box, Grid } from '@chakra-ui/react'
import { useParams, useSearch } from '@tanstack/react-router'

import { useJudgeDetails } from '../hooks'
import ProfessionalBackground from './ProfessionalBackground'
import Specialization from './Specialization'
import NotableJudgements from './NotableJudgements'
import RecentHearings from './RecentHearings'
import CaseStatistics from './CaseStatistics'
import CaseDistribution from './CaseDistribution'
import JudgeDetailsSkeleton from './JudgeDetailsSkeleton'

import type { EntityAction } from '@/features/shared/components/EntityHeader'
import { EntityNotFound } from '@/features/shared/components'
import { buildDynamicBreadcrumbs } from '@/utils/breadcrumbUtils'
import { DownloadIcon } from '@/features/shared/icons/DownloadIcon'
import EntityPageLayout from '@/features/shared/layout/EntityPageLayout'

const JudgeDetails = () => {
  const { judgeId } = useParams({ from: '/judge-profile/$judgeId' })
  const search = useSearch({ from: '/judge-profile/$judgeId' })
  const { data: judgeData, isLoading, error } = useJudgeDetails(judgeId)

  // Create info items for EntityHeader
  const infoItems = useMemo(() => {
    if (!judgeData) return []
    return [
      { label: 'BAR NO.:', value: judgeData.barRegistration },
      { label: 'Designation:', value: judgeData.title },
      { label: 'Years of Service:', value: judgeData.experience },
      {
        label: 'Court:',
        value: judgeData.court,
      },
    ]
  }, [judgeData])

  const HEADER_ACTIONS: Array<EntityAction> = useMemo(
    () => [
      {
        label: 'Export Profile',
        variant: 'outline',
        icon: <DownloadIcon size={16} />,
        onClick: () => console.log('Export clicked'),
        isDisabled: true,
      },
    ],
    [],
  )

  const layoutChildrens = useMemo(() => {
    if (!judgeData) return null

    return (
      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
        {/* Left Column */}
        <Box display="flex" flexDirection="column" gap={6}>
          {/* Professional Background */}
          <ProfessionalBackground data={judgeData} />

          {/* Areas of Specialization */}
          <Specialization data={judgeData} />

          {/* Notable Judgments */}
          <NotableJudgements data={judgeData} />

          {/* Recent Hearings */}
          <RecentHearings data={judgeData} />
        </Box>

        {/* Right Column */}
        <Box display="flex" flexDirection="column" gap={6}>
          {/* Case Statistics */}
          <CaseStatistics data={judgeData} />

          {/* Case Distribution */}
          <CaseDistribution data={judgeData} />
        </Box>
      </Grid>
    )
  }, [judgeData])

  const headerProps = useMemo(() => {
    if (!judgeData) return {}
    return {
      infoItems: infoItems,
      statusBadges: judgeData.status,
      title: judgeData.name,
      actions: HEADER_ACTIONS,
    }
  }, [judgeData, infoItems, HEADER_ACTIONS])

  // Build dynamic breadcrumbs based on navigation context
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
      // Case context (if coming from case details)
      caseId: search.caseId,
      caseNumber: search.caseNumber,
      // Judge context
      judgeId,
      judgeName: judgeData?.name,
      // Court context (if coming from court details)
      courtId: search.courtId,
      courtName: search.courtName,
      // Current page type
      currentPageType: 'judge',
    })
  }, [search, judgeId, judgeData?.name])

  // Show skeleton while loading
  if (isLoading) {
    return <JudgeDetailsSkeleton judgeId={judgeId} />
  }

  // Show error state if there's an error
  if (error || !judgeData) {
    return (
      <EntityNotFound entityType="Judge" breadcrumbItems={breadcrumbItems} />
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

export default JudgeDetails
