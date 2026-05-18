import { Suspense, lazy } from 'react'
import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '@/routes/routes'
import { ProtectedRoute } from '@/features/Auth/components/ProtectedRoute'
import { PageLoading } from '@/features/shared/components'

// Lazy load the SemanticSearchResult component
const SemanticSearchResult = lazy(
  () => import('../search-result/components/SemanticSearchResult'),
)

// Loading fallback component
const LoadingFallback = () => (
  <PageLoading message="Loading search results..." />
)

// Define the semantic search result route
export const semanticSearchResultRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/semantic-search/t/$id',
  validateSearch: (search: Record<string, any>) => {
    const result: Record<string, any> = {}

    // Add fromHistory flag if it exists
    if (search.fromHistory !== undefined) {
      result.fromHistory =
        search.fromHistory === true || search.fromHistory === 'true'
    }

    return result
  },
  component: () => (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <SemanticSearchResult />
      </Suspense>
    </ProtectedRoute>
  ),
})
