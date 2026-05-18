/**
 * Global logout service for handling 401 errors outside of React context
 * This service allows the axios interceptor to trigger logout when needed
 */

interface LogoutCallback {
  (): void
}

class LogoutService {
  private logoutCallback: LogoutCallback | null = null

  /**
   * Register a logout callback function
   * This should be called from the AuthContext to register the logout function
   */
  registerLogoutCallback(callback: LogoutCallback) {
    this.logoutCallback = callback
  }

  /**
   * Unregister the logout callback
   * This should be called when the AuthContext unmounts
   */
  unregisterLogoutCallback() {
    this.logoutCallback = null
  }

  /**
   * Trigger logout
   * This can be called from anywhere, including the axios interceptor
   */
  logout() {
    if (this.logoutCallback) {
      this.logoutCallback()
    } else {
      console.warn('No logout callback registered, using fallback logout')
      this.fallbackLogout()
    }
  }

  private fallbackLogout() {
    window.location.href = '/signin'
  }
}

// Export a singleton instance
export const logoutService = new LogoutService()
