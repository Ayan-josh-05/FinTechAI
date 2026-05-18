import { buildSearchParams } from './urlParams'

export interface BreadcrumbItem {
  label: string
  href?: string
  isCurrentPage?: boolean
}

export interface BreadcrumbContext {
  queryId?: string
  filters?: {
    dateFrom?: string
    dateTo?: string
    legalAct?: string
    riskScore?: string
    verificationStatus?: string
  }
  // Judge context
  judgeId?: string
  judgeName?: string
  // Case context
  caseId?: string
  caseNumber?: string
  // Court context
  courtId?: string
  courtName?: string
  // Lawyer context
  lawyerId?: string
  lawyerName?: string
  // Party context
  partyId?: string
  partyName?: string
  // Current page type (to determine which should appear last in breadcrumb)
  currentPageType?: 'case' | 'judge' | 'court' | 'lawyer' | 'party' | 'organization'
  // Organization context
  organizationId?: string
  organizationName?: string
}

/**
 * Builds dynamic breadcrumb items based on the current navigation context
 * Supports multiple flows:
 * - Legal Data Discovery > Search > Judge Profile
 * - Legal Data Discovery > Search > Judge Profile > Case Details
 * - Legal Data Discovery > Search > Court Details
 * - Legal Data Discovery > Search > Lawyer Profile
 * - Legal Data Discovery > Search > Case Details
 */
export const buildDynamicBreadcrumbs = (context: BreadcrumbContext): Array<BreadcrumbItem> => {
  const {
    queryId,
    filters,
    judgeId,
    judgeName,
    caseId,
    caseNumber,
    courtId,
    courtName,
    lawyerId,
    lawyerName,
    partyId,
    partyName,
    currentPageType
  } = context

  // Build search parameters for navigation back to search results
  const searchParams = buildSearchParams({
    query_id: queryId,
    filters
  })

  const searchHref = searchParams.toString()
    ? `/legal-data-discovery?${searchParams.toString()}`
    : "/legal-data-discovery"

  const breadcrumbs: Array<BreadcrumbItem> = [
    { label: "Legal Data Discovery", href: "/legal-data-discovery" },
    { label: "Search", href: searchHref }
  ]

  // Build intermediate breadcrumb items (not current page)
  const intermediateCrumbs: Array<BreadcrumbItem> = []

  // Add case details if we have context and it's not the current page
  if (caseId && caseNumber && currentPageType !== 'case') {
    const caseSearchParams = buildSearchParams({
      query_id: queryId,
      filters
    })

    caseSearchParams.set('caseId', caseId)
    caseSearchParams.set('caseNumber', caseNumber)

    const caseHref = caseSearchParams.toString()
      ? `/case-details/${caseId}?${caseSearchParams.toString()}`
      : `/case-details/${caseId}`

    intermediateCrumbs.push({
      label: caseNumber ? `Case Details - ${caseNumber}` : 'Case Details',
      href: caseHref
    })
  }

  // Add judge profile if we have context and it's not the current page
  if (judgeId && judgeName && currentPageType !== 'judge') {
    const judgeSearchParams = buildSearchParams({
      query_id: queryId,
      filters
    })

    // Add case context if available and not current page
    if (caseId && currentPageType !== 'case') {
      judgeSearchParams.set('caseId', caseId)
      judgeSearchParams.set('caseNumber', caseNumber!)
    }
    judgeSearchParams.set('judgeId', judgeId)
    judgeSearchParams.set('judgeName', judgeName)

    const judgeHref = judgeSearchParams.toString()
      ? `/judge-profile/${judgeId}?${judgeSearchParams.toString()}`
      : `/judge-profile/${judgeId}`

    intermediateCrumbs.push({
      label: `Judge Profile - ${judgeName}`,
      href: judgeHref
    })
  }

  // Add court details if we have context and it's not the current page
  if (courtId && courtName && currentPageType !== 'court') {
    const courtSearchParams = buildSearchParams({
      query_id: queryId,
      filters
    })

    // Add case context if available and not current page
    if (caseId && currentPageType !== 'case') {
      courtSearchParams.set('caseId', caseId)
      courtSearchParams.set('caseNumber', caseNumber!)
    }
    if (judgeId && currentPageType !== 'judge') {
      courtSearchParams.set('judgeId', judgeId)
      courtSearchParams.set('judgeName', judgeName!)
    }
    courtSearchParams.set('courtId', courtId)
    courtSearchParams.set('courtName', courtName)

    const courtHref = courtSearchParams.toString()
      ? `/court-details/${courtId}?${courtSearchParams.toString()}`
      : `/court-details/${courtId}`

    intermediateCrumbs.push({
      label: `Court Details - ${courtName}`,
      href: courtHref
    })
  }

  // Add lawyer profile if we have context and it's not the current page
  if (lawyerId && lawyerName && currentPageType !== 'lawyer') {
    const lawyerSearchParams = buildSearchParams({
      query_id: queryId,
      filters
    })

    // Add case context if available and not current page
    if (caseId && currentPageType !== 'case') {
      lawyerSearchParams.set('caseId', caseId)
      lawyerSearchParams.set('caseNumber', caseNumber!)
    }
    if (judgeId && currentPageType !== 'judge') {
      lawyerSearchParams.set('judgeId', judgeId)
      lawyerSearchParams.set('judgeName', judgeName!)
    }
    if (courtId && currentPageType !== 'court') {
      lawyerSearchParams.set('courtId', courtId)
      lawyerSearchParams.set('courtName', courtName!)
    }
    lawyerSearchParams.set('lawyerId', lawyerId)
    lawyerSearchParams.set('lawyerName', lawyerName)

    const lawyerHref = lawyerSearchParams.toString()
      ? `/lawyer-profile/${lawyerId}?${lawyerSearchParams.toString()}`
      : `/lawyer-profile/${lawyerId}`

    intermediateCrumbs.push({
      label: `Lawyer Profile - ${lawyerName}`,
      href: lawyerHref
    })
  }

  // Add party details if we have context and it's not the current page
  if (partyId && partyName && currentPageType !== 'party') {
    const partySearchParams = buildSearchParams({
      query_id: queryId,
      filters
    })

    // Add case context if available and not current page
    if (caseId && currentPageType !== 'case') {
      partySearchParams.set('caseId', caseId)
      partySearchParams.set('caseNumber', caseNumber!)
    }
    if (judgeId && currentPageType !== 'judge') {
      partySearchParams.set('judgeId', judgeId)
      partySearchParams.set('judgeName', judgeName!)
    }
    if (courtId && currentPageType !== 'court') {
      partySearchParams.set('courtId', courtId)
      partySearchParams.set('courtName', courtName!)
    }
    if (lawyerId && currentPageType !== 'lawyer') {
      partySearchParams.set('lawyerId', lawyerId)
      partySearchParams.set('lawyerName', lawyerName!)
    }
    partySearchParams.set('partyId', partyId)
    partySearchParams.set('partyName', partyName)

    const partyHref = partySearchParams.toString()
      ? `/user-details/${partyId}?${partySearchParams.toString()}`
      : `/user-details/${partyId}`

    intermediateCrumbs.push({
      label: `Party Details - ${partyName}`,
      href: partyHref
    })
  }

  // Add organization details if we have context and it's not the current page
  if (context.organizationId && context.organizationName && currentPageType !== 'organization') {
    const orgSearchParams = buildSearchParams({
      query_id: queryId,
      filters
    })

    // Add case context if available and not current page
    if (caseId && currentPageType !== 'case') {
      orgSearchParams.set('caseId', caseId)
      orgSearchParams.set('caseNumber', caseNumber!)
    }
    if (judgeId && currentPageType !== 'judge') {
      orgSearchParams.set('judgeId', judgeId)
      orgSearchParams.set('judgeName', judgeName!)
    }
    if (courtId && currentPageType !== 'court') {
      orgSearchParams.set('courtId', courtId)
      orgSearchParams.set('courtName', courtName!)
    }
    if (lawyerId && currentPageType !== 'lawyer') {
      orgSearchParams.set('lawyerId', lawyerId)
      orgSearchParams.set('lawyerName', lawyerName!)
    }
    if (partyId && currentPageType !== 'party') {
      orgSearchParams.set('partyId', partyId)
      orgSearchParams.set('partyName', partyName!)
    }
    orgSearchParams.set('partyId', context.organizationId)
    orgSearchParams.set('partyName', context.organizationName)

    const orgHref = orgSearchParams.toString()
      ? `/organization/${context.organizationId}?${orgSearchParams.toString()}`
      : `/organization/${context.organizationId}`

    intermediateCrumbs.push({
      label: `Organization - ${context.organizationName}`,
      href: orgHref
    })
  }

  // Add all intermediate breadcrumbs
  breadcrumbs.push(...intermediateCrumbs)

  // Add current page breadcrumb (the one being viewed)
  if (currentPageType === 'case' && caseId && caseNumber) {
    const displayCaseNumber = caseNumber || caseId
    breadcrumbs.push({
      label: `Case Details - ${displayCaseNumber}`,
      isCurrentPage: true
    })
  } else if (currentPageType === 'judge' && judgeId && judgeName) {
    breadcrumbs.push({
      label: `Judge Profile - ${judgeName}`,
      isCurrentPage: true
    })
  } else if (currentPageType === 'court' && courtId && courtName) {
    breadcrumbs.push({
      label: `Court Details - ${courtName}`,
      isCurrentPage: true
    })
  } else if (currentPageType === 'lawyer' && lawyerId && lawyerName) {
    breadcrumbs.push({
      label: `Lawyer Profile - ${lawyerName}`,
      isCurrentPage: true
    })
  } else if (currentPageType === 'party' && partyId && partyName) {
    breadcrumbs.push({
      label: `Party Details - ${partyName}`,
      isCurrentPage: true
    })
  } else if (currentPageType === 'organization' && context.organizationId && context.organizationName) {
    breadcrumbs.push({
      label: `Organization - ${context.organizationName}`,
      isCurrentPage: true
    })
  }

  return breadcrumbs
}

/**
 * Extracts breadcrumb context from URL search parameters
 */
export const extractBreadcrumbContext = (searchParams: URLSearchParams): Partial<BreadcrumbContext> => {
  const context: Partial<BreadcrumbContext> = {}

  if (searchParams.get('query_id')) {
    context.queryId = searchParams.get('query_id')!
  }

  // Extract case context
  if (searchParams.get('caseId')) {
    context.caseId = searchParams.get('caseId')!
  }
  if (searchParams.get('caseNumber')) {
    context.caseNumber = searchParams.get('caseNumber')!
  }

  // Extract judge context
  if (searchParams.get('judgeId')) {
    context.judgeId = searchParams.get('judgeId')!
  }
  if (searchParams.get('judgeName')) {
    context.judgeName = searchParams.get('judgeName')!
  }

  // Extract court context
  if (searchParams.get('courtId')) {
    context.courtId = searchParams.get('courtId')!
  }
  if (searchParams.get('courtName')) {
    context.courtName = searchParams.get('courtName')!
  }

  // Extract lawyer context
  if (searchParams.get('lawyerId')) {
    context.lawyerId = searchParams.get('lawyerId')!
  }
  if (searchParams.get('lawyerName')) {
    context.lawyerName = searchParams.get('lawyerName')!
  }

  // Extract party context
  if (searchParams.get('partyId')) {
    context.partyId = searchParams.get('partyId')!
  }
  if (searchParams.get('partyName')) {
    context.partyName = searchParams.get('partyName')!
  }

  // Extract organization context
  if (searchParams.get('organizationId')) {
    context.organizationId = searchParams.get('organizationId')!
  }
  if (searchParams.get('organizationName')) {
    context.organizationName = searchParams.get('organizationName')!
  }

  // Extract filter parameters
  const filters: BreadcrumbContext['filters'] = {}
  if (searchParams.get('dateFrom')) filters.dateFrom = searchParams.get('dateFrom')!
  if (searchParams.get('dateTo')) filters.dateTo = searchParams.get('dateTo')!
  if (searchParams.get('legalAct')) filters.legalAct = searchParams.get('legalAct')!
  if (searchParams.get('riskScore')) filters.riskScore = searchParams.get('riskScore')!
  if (searchParams.get('verificationStatus')) filters.verificationStatus = searchParams.get('verificationStatus')!

  if (Object.keys(filters).length > 0) {
    context.filters = filters
  }

  return context
}


/**
 * Builds navigation URL with breadcrumb context preserved
 */
export const buildNavigationUrl = (
  path: string,
  context: BreadcrumbContext,
  additionalParams?: Record<string, string>
): string => {
  const searchParams = buildSearchParams({
    query_id: context.queryId,
    filters: context.filters
  })

  // Add entity context parameters manually
  if (context.judgeId) searchParams.set('judgeId', context.judgeId)
  if (context.judgeName) searchParams.set('judgeName', context.judgeName)
  if (context.courtId) searchParams.set('courtId', context.courtId)
  if (context.courtName) searchParams.set('courtName', context.courtName)
  if (context.lawyerId) searchParams.set('lawyerId', context.lawyerId)
  if (context.lawyerName) searchParams.set('lawyerName', context.lawyerName)
  if (context.organizationId) searchParams.set('organizationId', context.organizationId)
  if (context.organizationName) searchParams.set('organizationName', context.organizationName)
  if (context.partyId) searchParams.set('partyId', context.partyId)
  if (context.partyName) searchParams.set('partyName', context.partyName)

  // Add additional parameters
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      searchParams.set(key, value)
    })
  }

  return searchParams.toString() ? `${path}?${searchParams.toString()}` : path
}
