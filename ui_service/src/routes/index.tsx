import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routes'

import * as TanStackQueryProvider from '@/integrations/tanstack-query/root-provider.tsx'

export const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProvider.getContext(),
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
})

export { routeTree }
