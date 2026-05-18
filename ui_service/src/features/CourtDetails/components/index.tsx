import React, { useMemo } from 'react'
import { FiDownload, FiSave } from 'react-icons/fi'
import { useParams, useSearch } from '@tanstack/react-router'

// Import types
import type { Judge } from '@/features/CourtDetails/types'
import type { EntityAction } from '@/features/shared/components'
import type { EntityInfoItem } from '@/features/shared/components/EntityHeader'

// Import constants
import { COURT_DETAILS_TEXT } from '@/features/CourtDetails/constants'
import { buildDynamicBreadcrumbs } from '@/utils/breadcrumbUtils'
import { formatDateForDisplay } from '@/utils/dateUtils'

// Import local components
import { CourtOverview } from '@/features/CourtDetails/components/CourtOverview'
import { CaseStatistics } from '@/features/CourtDetails/components/CaseStatistics'
import { CourtLocation } from '@/features/CourtDetails/components/CourtLocation'
import { JudgesRoster } from '@/features/CourtDetails/components/JudgesRoster'
import CourtDetailsSkeleton from '@/features/CourtDetails/components/CourtDetailsSkeleton'
import { useCourtDetails } from '@/features/CourtDetails/hooks'
import EntityPageLayout from '@/features/shared/layout/EntityPageLayout'
import { EntityNotFound } from '@/features/shared/components'

const CourtDetails: React.FC = () => {
  const { courtId } = useParams({ from: '/court-details/$courtId' })
  const search = useSearch({ from: '/court-details/$courtId' })
  const { data: courtData, isLoading, error } = useCourtDetails(courtId)
  const { header, courtInfo: courtInfoText } = COURT_DETAILS_TEXT

  // Create info items for EntityHeader
  const courtInfoItems: Array<EntityInfoItem> = useMemo(() => {
    if (!courtData) return []
    return [
      {
        label: courtInfoText.established,
        value: formatDateForDisplay(courtData.courtInfo.established),
      },
    ]
  }, [courtData, courtInfoText])

  // Create header action buttons
  const headerActions: Array<EntityAction> = useMemo(
    () => [
      {
        label: header.saveToQuery,
        icon: <FiSave />,
        variant: 'primary',
        onClick: () => console.log('Save to Query clicked'),
        isDisabled: true,
      },
      {
        label: header.exportData,
        icon: <FiDownload />,
        variant: 'outline',
        onClick: () => console.log('Export Data clicked'),
        isDisabled: true,
      },
    ],
    [header],
  )

  const layoutChildrens = useMemo(() => {
    if (!courtData) return null

    return (
      <>
        {/* Court Overview with Statistics */}
        <CourtOverview courtData={courtData} />

        {/* Judges Roster */}
        <JudgesRoster judges={courtData.judges as unknown as Array<Judge>} />

        {/* Case Statistics */}
        <CaseStatistics courtData={courtData} />

        {/* Court Location */}
        <CourtLocation courtData={courtData} />
      </>
    )
  }, [courtData])

  const headerProps = useMemo(() => {
    if (!courtData) return {}
    return {
      infoItems: courtInfoItems,
      statusBadges: [...courtData.courtInfo.courtBadges],
      title: courtData.location.name,
      actions: headerActions,
    }
  }, [courtData, courtInfoItems, headerActions])

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
      // Judge context (if coming from judge profile)
      judgeId: search.judgeId,
      judgeName: search.judgeName,
      // Court context
      courtId,
      courtName: courtData?.location.name,
      // Current page type
      currentPageType: 'court',
    })
  }, [search, courtId, courtData?.location.name])

  // Show skeleton while loading
  if (isLoading) {
    return <CourtDetailsSkeleton courtId={courtId} />
  }

  // Show error state if there's an error
  if (error || !courtData) {
    return (
      <EntityNotFound entityType="Court" breadcrumbItems={breadcrumbItems} />
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

export default CourtDetails

// Export all components for external use
export { CourtOverview } from '@/features/CourtDetails/components/CourtOverview'
export { CaseStatistics } from '@/features/CourtDetails/components/CaseStatistics'
export { CourtLocation } from '@/features/CourtDetails/components/CourtLocation'
export { JudgesRoster } from '@/features/CourtDetails/components/JudgesRoster'
export { JudgeCard } from '@/features/CourtDetails/components/JudgeCard'
export { StatCard } from '@/features/CourtDetails/components/StatCard'
