// routes.tsx
import {
  Outlet,
  createRootRoute,
  createRoute,
  useNavigate,
} from '@tanstack/react-router'
import { Box } from '@chakra-ui/react'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Suspense, lazy, useEffect } from 'react'

// Import layout components (not lazy loaded as they're always needed)
import HeaderWrapper from '@/features/shared/layout/HeaderWrapper'
import Footer from '@/features/shared/layout/Footer.tsx'
import { QueryManagement } from '@/features/QueryManagement/components'
import OrganizationDetails from '@/features/OrganizationDetails/components'
import Dashboard from '@/features/Dashboard/components'
import UserProfile from '@/features/UserProfile/components'
import { NotFound, PageLoading, Toaster } from '@/features/shared/components'
import { ProtectedRoute } from '@/features/Auth/components/ProtectedRoute'
import { useAuthInitialization } from '@/features/Auth/hooks/useAuthInitialization'
import { useAuthStore } from '@/features/Auth/store/authStore'

// Import case details route
import { caseDetailsRoute } from '@/features/CaseDetails/pages/CaseDetailsPage'
import { semanticSearchRoute } from '@/features/SemanticSearch/pages/SemanticSearchPage'
import { semanticSearchResultRoute } from '@/features/SemanticSearch/pages/SemanticSearchResultPage'
import UserDetails from '@/features/UserDetails/components'

import { COLORS } from '@/features/shared/constants/StyleConstants'
// Lazy load page components
const SignIn = lazy(() => import('@/features/Auth/SignIn'))
const CreateProfile = lazy(() => import('@/features/Auth/CreateProfile'))
const EditProfile = lazy(() => import('@/features/UserProfile/EditProfile'))
const LegalDataDiscovery = lazy(
  () => import('@/features/LegalDataDiscovery/components'),
)
const CourtDetails = lazy(() => import('@/features/CourtDetails/components'))
const JudgeDetails = lazy(() => import('@/features/JudgeProfile/components'))
const LawyerProfile = lazy(() => import('@/features/LawyerProfile/components'))

// Loading fallback component
const LoadingFallback = () => <PageLoading message="Loading page..." />

// Root layout component with auth initialization
const RootLayout = () => {
  const isLoading = useAuthStore((state) => state.isLoading)
  
  // Initialize auth on every app boot (unconditional)
  useAuthInitialization()

  // Show loading screen while initializing auth
  if (isLoading) {
    return <LoadingFallback />
  }

  return (
    <Box
      minH="100vh"
      display="flex"
      flexDirection="column"
      bg={COLORS.neutral[50]}
    >
      <HeaderWrapper />
      <Box as="main" flex={1}>
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </Box>
      <Footer />
      <TanStackRouterDevtools />
      <Toaster />
    </Box>
  )
}

// Root redirect component
const RootRedirect = () => {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading) {
      // Only redirect authenticated users to dashboard
      // Unauthenticated users will be redirected to /signin by axios interceptor
      if (user) {
        navigate({ to: '/dashboard' })
      } else {
        navigate({ to: '/signin' })
      }
    }
  }, [user, isLoading, navigate])

  return <LoadingFallback />
}

// Define the root route
export const rootRoute = createRootRoute({
  component: RootLayout,
})

// Define child routes with lazy loaded components
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: RootRedirect,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: Dashboard,
})

const signinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signin',
  component: () => (
    <Suspense fallback={<LoadingFallback />}>
      <SignIn />
    </Suspense>
  ),
})

const createProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create-profile',
  validateSearch: (search: Record<string, any>) => {
    return {
      step: search.step || '1',
      token: search.token || '',
      from: search.from || '',
    }
  },
  component: () => (
    <Suspense fallback={<LoadingFallback />}>
      <CreateProfile />
    </Suspense>
  ),
})

const legalDataDiscoveryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legal-data-discovery',
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

    return result
  },
  component: () => (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <LegalDataDiscovery />
      </Suspense>
    </ProtectedRoute>
  ),
})

const courtDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/court-details/$courtId',
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

    return result
  },
  component: () => (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <CourtDetails />
      </Suspense>
    </ProtectedRoute>
  ),
})

const JudgeDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/judge-profile/$judgeId',
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
  component: () => (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <JudgeDetails />
      </Suspense>
    </ProtectedRoute>
  ),
})

const LawyersProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lawyer-profile/$lawyerId',
  component: () => (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <LawyerProfile />
      </Suspense>
    </ProtectedRoute>
  ),
})

const userDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/user-details/$userId',
  component: () => (
    <ProtectedRoute>
      <UserDetails />
    </ProtectedRoute>
  ),
})

const queryManagementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/query-management',
  component: () => (
    <ProtectedRoute>
      <QueryManagement />
    </ProtectedRoute>
  ),
})

const userProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: () => (
    <ProtectedRoute>
      <UserProfile />
    </ProtectedRoute>
  ),
})

const organizationDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/organization/$id',
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

    // Add breadcrumb context parameters
    if (search.caseId) result.caseId = search.caseId
    if (search.caseNumber) result.caseNumber = search.caseNumber
    if (search.judgeId) result.judgeId = search.judgeId
    if (search.judgeName) result.judgeName = search.judgeName
    if (search.courtId) result.courtId = search.courtId
    if (search.courtName) result.courtName = search.courtName
    if (search.lawyerId) result.lawyerId = search.lawyerId
    if (search.lawyerName) result.lawyerName = search.lawyerName
    if (search.partyId) result.partyId = search.partyId
    if (search.partyName) result.partyName = search.partyName
    if (search.organizationId) result.organizationId = search.organizationId
    if (search.organizationName)
      result.organizationName = search.organizationName

    return result
  },
  component: () => (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <OrganizationDetails />
      </Suspense>
    </ProtectedRoute>
  ),
})

const editProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/edit-profile',
  component: () => (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <EditProfile />
      </Suspense>
    </ProtectedRoute>
  ),
})

// Catch-all route for 404 Not Found
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: () => (
    <ProtectedRoute>
      <NotFound />
    </ProtectedRoute>
  ),
})

// Build the route tree
export const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  signinRoute,
  createProfileRoute,
  editProfileRoute,
  legalDataDiscoveryRoute,
  courtDetailsRoute,
  caseDetailsRoute,
  JudgeDetailsRoute,
  LawyersProfileRoute,
  userDetailsRoute,
  queryManagementRoute,
  userProfileRoute,
  organizationDetailsRoute,
  semanticSearchRoute,
  semanticSearchResultRoute,
  notFoundRoute,
])
