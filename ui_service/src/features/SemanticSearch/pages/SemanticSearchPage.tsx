import { Suspense, lazy } from 'react'
import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '@/routes/routes'
import { ProtectedRoute } from '@/features/Auth/components/ProtectedRoute'
import { PageLoading } from '@/features/shared/components'

// Lazy load the SemanticSearch component
const SemanticSearch = lazy(() => import('../components'))

// Loading fallback component
const LoadingFallback = () => <PageLoading message="Loading search..." />

// Define the semantic search route
export const semanticSearchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/semantic-search',
  validateSearch: (search: Record<string, any>) => {
    const result: Record<string, any> = {}

    const filterKeys = [
      'dateFrom',
      'dateTo',
      'legalAct',
      'riskScore',
      'verificationStatus',
    ]

    filterKeys.forEach((key) => {
      if (search[key] !== undefined) {
        result[key] = search[key]
      }
    })

    return result
  },
  component: () => (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <SemanticSearch />
      </Suspense>
    </ProtectedRoute>
  ),
})
