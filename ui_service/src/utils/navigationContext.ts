import { useParams, useSearch } from '@tanstack/react-router'

/**
 * Custom hook to capture current page context for navigation
 * This hook dynamically determines the current page type and extracts relevant context
 * to be preserved during navigation for proper breadcrumb support
 */
export const useNavigationContext = () => {
  const params = useParams({ strict: false })
  const search = useSearch({ strict: false })

  /**
   * Get the current page context based on the route and parameters
   */
  const getCurrentPageContext = () => {
    const currentPath = window.location.pathname
    const context: Record<string, string> = {}

    // Copy all existing search parameters
    Object.entries(search).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        context[key] = String(value)
      }
    })

    // Determine page type and add specific context
    if (currentPath.includes('/case-details/')) {
      // Case Details Page
      if (params.caseId) {
        context.caseId = params.caseId
        context.caseNumber = search.caseNumber || params.caseId // Use caseNumber from search if available
        context.caseTitle = search.caseTitle || 'Case Details'
        context.pageType = 'case-details'
        context.pageLabel = `Case Details - ${context.caseNumber}`
      }
    } else if (currentPath.includes('/court-details/')) {
      // Court Details Page
      if (params.courtId) {
        context.courtId = params.courtId
        context.courtName = search.courtName || params.courtId
        context.pageType = 'court-details'
        context.pageLabel = `Court Details - ${context.courtName}`
      }
    } else if (currentPath.includes('/judge-profile/')) {
      // Judge Profile Page
      if (params.judgeId) {
        context.judgeId = params.judgeId
        context.judgeName = search.judgeName || params.judgeId
        context.pageType = 'judge-profile'
        context.pageLabel = `Judge Profile - ${context.judgeName}`
      }
    } else if (currentPath.includes('/lawyer-profile/')) {
      // Lawyer Profile Page
      if (params.lawyerId) {
        context.lawyerId = params.lawyerId
        context.lawyerName = search.lawyerName || params.lawyerId
        context.pageType = 'lawyer-profile'
        context.pageLabel = `Lawyer Profile - ${context.lawyerName}`
      }
    } else if (currentPath.includes('/user-details/')) {
      // User Details Page (Party Details)
      if (params.userId) {
        context.partyId = params.userId
        context.partyName = search.partyName || params.userId
        context.pageType = 'user-details'
        context.pageLabel = `Party Details - ${context.partyName}`
      }
    } else if (currentPath.includes('/organization/')) {
      // Organization Details Page
      if (params.id) {
        context.organizationId = params.id
        context.organizationName = search.organizationName || search.partyName || params.id
        context.pageType = 'organization-details'
        context.pageLabel = `Organization - ${context.organizationName}`
      }
    } else if (currentPath.includes('/legal-data-discovery')) {
      // Legal Data Discovery Page
      context.pageType = 'legal-data-discovery'
      context.pageLabel = 'Legal Data Discovery'
      if (search.query_id) {
        context.queryId = search.query_id
      }
    }

    return context
  }

  /**
   * Create navigation object with current page context preserved
   */
  const createNavigationWithContext = (
    targetPath: string,
    targetParams: Record<string, string>,
    additionalContext: Record<string, string> = {}
  ) => {
    const currentContext = getCurrentPageContext()

    // Merge current context with additional context
    const finalContext = {
      ...currentContext,
      ...additionalContext,
    }

    return {
      to: targetPath,
      params: targetParams,
      search: finalContext,
    }
  }

  return {
    getCurrentPageContext,
    createNavigationWithContext,
    currentParams: params,
    currentSearch: search,
  }
}
