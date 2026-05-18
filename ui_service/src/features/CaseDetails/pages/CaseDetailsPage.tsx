import { lazy } from 'react'
import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '@/routes/routes'
import { ProtectedRoute } from '@/features/Auth/components/ProtectedRoute'

// Lazy load the CaseDetails component
const CaseDetailsComponent = lazy(() => import('../components'))

// Case Details page component
const CaseDetailsPage = () => {
  return (
    <ProtectedRoute>
      <CaseDetailsComponent />
    </ProtectedRoute>
  )
}

// Define the case details route
export const caseDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/case-details/$caseId',
  validateSearch: (search: Record<string, any>) => {
    const result: any = {}

    // Only add query_id if it exists
    if (search.query_id) result.query_id = search.query_id

    // Only add filter parameters if they exist
    if (search.dateFrom) result.dateFrom = search.dateFrom
    if (search.dateTo) result.dateTo = search.dateTo
    if (search.legalAct) result.legalAct = search.legalAct
    if (search.riskScore) result.riskScore = search.riskScore
    if (search.verificationStatus)
      result.verificationStatus = search.verificationStatus

    // Add judge context parameters for breadcrumb navigation
    if (search.judgeId) result.judgeId = search.judgeId
    if (search.judgeName) result.judgeName = search.judgeName

    return result
  },
  component: CaseDetailsPage,
})

export default CaseDetailsPage
