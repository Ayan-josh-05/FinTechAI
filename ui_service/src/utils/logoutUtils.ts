/**
 * Utility functions for handling logout and clearing user-specific data
 */

/**
 * Clears all user-specific data from localStorage
 * This includes search state, timestamps, and any other user-specific cached data
 */
export const clearUserDataFromStorage = (): void => {
  try {
    // Clear legal discovery search state
    localStorage.removeItem('legal_discovery_search_state')
    localStorage.removeItem('legal_discovery_search_timestamp')
    localStorage.removeItem('legal-discovery-search-store')

    // Add any other user-specific localStorage keys here as needed
    // Example: localStorage.removeItem('user-preferences')
    // Example: localStorage.removeItem('dashboard-settings')

    console.log('User data cleared from localStorage')
  } catch (error) {
    console.warn('Failed to clear user data from localStorage:', error)
  }
}

/**
 * Clears all cookies related to authentication
 */
export const clearAuthCookies = (): void => {
  try {
    // Remove authentication cookies with proper path settings
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'

    console.log('Authentication cookies cleared')
  } catch (error) {
    console.warn('Failed to clear authentication cookies:', error)
  }
}
