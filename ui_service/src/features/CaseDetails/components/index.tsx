import { useMemo } from 'react'
import { Grid, GridItem, VStack } from '@chakra-ui/react'
import { FaBookmark } from 'react-icons/fa'
import { useParams, useSearch } from '@tanstack/react-router'

import { useCaseDetails } from '../hooks'
import CaseDocuments from './CaseDocuments'
import CaseOverview from './CaseOverview'
import CaseTimeline from './CaseTimeline'
import CourtInformation from './CourtInformation'
import CurrentStatus from './CurrentStatus'
import InvolvedParties from './InvolvedParties'
import InvolvedLawyer from './InvolvedLawyer'
import LegalSections from './LegalSections'
import CaseDetailsSkeleton from './CaseDetailsSkeleton'
import FinancialSummary from './FinancialSummary'
import type { EntityAction } from '@/features/shared/components/EntityHeader'
import { EntityNotFound } from '@/features/shared/components'
import { buildDynamicBreadcrumbs } from '@/utils/breadcrumbUtils'
import { formatDateForDisplay } from '@/utils/dateUtils'
import { DownloadIcon } from '@/features/shared/icons/DownloadIcon'
import EntityPageLayout from '@/features/shared/layout/EntityPageLayout'

const CaseDetails = () => {
  const { caseId } = useParams({ from: '/case-details/$caseId' })
  const search = useSearch({ from: '/case-details/$caseId' })
  const { data: caseDetails, isLoading, error } = useCaseDetails(caseId)

  // Create info items for EntityHeader
  const infoItems = useMemo(() => {
    if (!caseDetails) return []

    // Format risk score as "value/10" if not empty and not "N/A"
    const riskScoreValue =
      caseDetails.riskScore && caseDetails.riskScore !== 'N/A'
        ? `${caseDetails.riskScore}/10`
        : caseDetails.riskScore || '-'

    // Format filing date to DD/MM/YYYY
    const formattedFilingDate =
      formatDateForDisplay(caseDetails.filingDate) || caseDetails.filingDate

    return [
      { label: 'Case Number:', value: caseDetails.caseNumber },
      { label: 'CNR Number:', value: caseDetails.cnrNumber ? caseDetails.cnrNumber : "N/A" },
      { label: 'Filing Date:', value: formattedFilingDate },
      { label: 'Risk Score:', value: riskScoreValue },
    ]
  }, [caseDetails])

  // Create header action buttons
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
        icon: <DownloadIcon size={10} />,
        onClick: () => console.log('Export clicked'),
        isDisabled: true,
      },
    ],
    [],
  )

  const layoutChildrens = useMemo(() => {
    if (!caseDetails) return null

    return (
      <>
        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
          {/* Left Column */}
          <GridItem>
            <VStack gap={6} align="stretch">
              <CaseOverview caseDetails={caseDetails} />
              <InvolvedParties
                involvedParties={caseDetails.involvedParties}
                caseNumber={caseDetails.caseNumber}
              />
              <FinancialSummary
                financialSummary={caseDetails.financialSummary}
              />
              <InvolvedLawyer involvedLawyers={caseDetails.involveLawyers} />
              <CaseTimeline timeline={caseDetails.timeline} />
            </VStack>
          </GridItem>

          {/* Right Column */}
          <GridItem>
            <VStack gap={6} align="stretch">
              <CourtInformation
                courtInfo={caseDetails.court}
                caseNumber={caseDetails.caseNumber}
              />
              <CurrentStatus currentStatus={caseDetails.currentStatus} />
              <LegalSections legalSections={caseDetails.legalSections} />
              <CaseDocuments documents={caseDetails.documents} />
            </VStack>
          </GridItem>
        </Grid>
      </>
    )
  }, [caseDetails])

  const headerProps = useMemo(() => {
    if (!caseDetails) return {}
    return {
      infoItems: infoItems,
      statusBadges: caseDetails.status,
      title: caseDetails.title,
      actions: headerActions,
    }
  }, [caseDetails, infoItems, headerActions])

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
      // Judge context (if coming from judge profile)
      judgeId: search.judgeId,
      judgeName: search.judgeName,
      // Case context
      caseId,
      caseNumber: caseDetails?.caseNumber,
      // Court context (if coming from court details)
      courtId: search.courtId,
      courtName: search.courtName,
      // Lawyer context (if coming from lawyer profile)
      lawyerId: search.lawyerId,
      lawyerName: search.lawyerName,
      // Current page type
      currentPageType: 'case',
    })
  }, [search, caseId, caseDetails?.caseNumber])

  // Show skeleton while loading
  if (isLoading) {
    return <CaseDetailsSkeleton caseId={caseId} />
  }

  // Show error state if there's an error
  if (error || !caseDetails) {
    return (
      <EntityNotFound entityType="Case" breadcrumbItems={breadcrumbItems} />
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

export default CaseDetails
