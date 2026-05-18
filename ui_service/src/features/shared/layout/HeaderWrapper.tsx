import Header from './Header'

/**
 * Wrapper component for Header
 * Now using Zustand store instead of AuthContext
 */
export default function HeaderWrapper() {
  // No longer need AuthContext check since we're using Zustand
  // Header component handles its own auth state via useAuthStore
  return <Header />
}
