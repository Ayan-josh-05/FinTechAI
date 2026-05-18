/**
 * Axios Interceptor with Comprehensive Error Handling
 * 
 * This interceptor provides centralized error handling for all HTTP requests
 * with optional error notification control.
 * 
 * Features:
 * - Automatic token management
 * - Comprehensive HTTP status code handling
 * - Configurable error notifications
 * - Automatic redirect on authentication errors
 * - Network error detection
 * 
 * Usage Examples:
 * 
 * 1. Default behavior (shows error notifications):
 *    api.post('/auth/login', credentials)
 * 
 * 2. Disable error notifications:
 *    api.post('/auth/login', credentials, { showErrorNotification: false })
 * 
 * 3. Using the utility function:
 *    import { createAxiosConfig } from './axiosInterceptor'
 *    api.post('/auth/login', credentials, createAxiosConfig(false))
 * 
 * 4. In API functions:
 *    export const signInUser = async (credentials, showErrorNotification = true) => {
 *      const response = await api.post('/auth/login', credentials, { showErrorNotification } as any)
 *      return response.data
 *    }
 * 
 * Error Handling:
 * - 400: Bad Request - Invalid request data
 * - 401: Unauthorized - Clears auth data and redirects to signin (except for /auth/login)
 * - 403: Forbidden - Permission denied
 * - 404: Not Found - Resource not found
 * - 409: Conflict - Request conflicts with current state
 * - 422: Validation Error - Invalid input data
 * - 429: Too Many Requests - Rate limiting
 * - 500: Server Error - Internal server error
 * - 502-504: Service Unavailable - Gateway/Proxy errors
 * - Network errors: Connection issues
 * - Other errors: Unexpected errors
 */

import axios from 'axios';
import { API_BASE_URL } from '../constants';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ToastNotifications } from '@/features/shared/components/ToastNotifications';
import { useAuthStore } from '@/features/Auth/store/authStore';

// Extend InternalAxiosRequestConfig to include our custom flags
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  showErrorNotification?: boolean;
  _retry?: boolean; // Flag to prevent infinite retry loops
}

// Create an axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/**
 * Utility function to create axios config with error notification control
 * @param showErrorNotification - Whether to show error notifications (default: true)
 * @returns Axios config object
 */
export const createAxiosConfig = (showErrorNotification = true) => ({
  showErrorNotification,
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Cast to our custom config to access showErrorNotification
    const customConfig = config as CustomAxiosRequestConfig;

    // Set default value for showErrorNotification if not provided
    if (customConfig.showErrorNotification === undefined) {
      customConfig.showErrorNotification = true;
    }

    // NO token attachment needed - browser automatically sends httpOnly cookies
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Helper function to handle logout and redirect
const handleLogout = () => {
  console.log('Axios Interceptor: Session expired - clearing user state and redirecting');

  // Clear user from Zustand store
  const { clearUser } = useAuthStore.getState();
  clearUser();

  // Only redirect if not already on signin page (prevent double redirect)
  if (window.location.pathname !== '/signin') {
    window.location.href = '/signin';
  }
};

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig;
    const showErrorNotification = config.showErrorNotification !== false; // Default to true

    // Small helper to extract a meaningful error description from server responses
    const extractErrorDescription = (data: any, fallback: string): string => {
      if (!data) return fallback;
      return (
        (typeof data.detail === 'string' && data.detail) ||
        (typeof data.message === 'string' && data.message) ||
        (typeof data.error === 'string' && data.error) ||
        fallback
      );
    };

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      // Handle specific HTTP status codes
      switch (status) {
        case 400:
          if (showErrorNotification) {
            ToastNotifications.error({
              title: 'Error',
              description: extractErrorDescription(data, 'Invalid request data'),
            });
          }
          break;

        case 401: {
          // ANY 401 = session dead
          // NO token refresh attempts - backend handles token refresh
          const requestConfig = error.config as CustomAxiosRequestConfig;

          // For login endpoint, just reject the error without logout/redirect
          if (requestConfig.url?.includes('/auth/login')) {
            console.log('401 error on login endpoint - invalid credentials');
            if (showErrorNotification) {
              ToastNotifications.error({
                title: 'Login Failed',
                description: extractErrorDescription(data, 'Invalid email or password'),
              });
            }
            return Promise.reject(error);
          }

          // For /auth/me endpoint during initialization, just clear state without redirect
          // This prevents infinite loops when checking auth on app boot
          if (requestConfig.url?.includes('/auth/me')) {
            console.log('401 error on /auth/me - session invalid, clearing state');
            const { clearUser } = useAuthStore.getState();
            clearUser();
            return Promise.reject(error);
          }

          // For all other endpoints, session is dead - clear state and redirect
          console.log('401 error - session expired, logging out user');
          handleLogout();
          
          // Don't show "Session Expired" notification for automatic logouts
          // User will see appropriate success/error messages from their actions
          // For all other endpoints, session is dead - clear state and redirect
          console.log('401 error - session expired, logging out user');
          handleLogout();
          
          // Don't show "Session Expired" notification for automatic logouts
          // User will see appropriate success/error messages from their actions
          
          return Promise.reject(error);
        }

        case 403:
          if (showErrorNotification) {
            ToastNotifications.error({
              title: 'Forbidden',
              description: extractErrorDescription(data, 'You do not have permission to perform this action'),
            });
          }
          break;

        case 404: {
          if (showErrorNotification) {
            // Check if this is a chat history request
            const isChatHistoryRequest = config.url?.includes('/semantic-search/chat/history/');
            
            if (isChatHistoryRequest) {
              ToastNotifications.error({
                title: 'Chat Not Found',
                description: 'This chat conversation no longer exists or has been deleted.',
              });
            } else {
              ToastNotifications.error({
                title: 'Not Found',
                description: extractErrorDescription(data, 'The requested resource was not found'),
              });
            }
          }
          break;
        }

        case 409:
          if (showErrorNotification) {
            ToastNotifications.error({
              title: 'Conflict',
              description: extractErrorDescription(data, 'The request conflicts with the current state'),
            });
          }
          break;

        case 422:
          if (showErrorNotification) {
            ToastNotifications.error({
              title: 'Validation Error',
              description: extractErrorDescription(data, 'Please check your input and try again'),
            });
          }
          break;

        case 429:
          if (showErrorNotification) {
            ToastNotifications.error({
              title: 'Too Many Requests',
              description: extractErrorDescription(data, 'Please wait a moment before trying again'),
            });
          }
          break;

        case 500:
          if (showErrorNotification) {
            ToastNotifications.serverError();
          }
          break;

        case 502:
        case 503:
        case 504:
          if (showErrorNotification) {
            ToastNotifications.error({
              title: 'Service Unavailable',
              description: extractErrorDescription(data, 'The service is temporarily unavailable. Please try again later.'),
            });
          }
          break;

        default:
          if (showErrorNotification) {
            ToastNotifications.error({
              title: 'Request Failed',
              description: extractErrorDescription(data, `Request failed with status ${status}`),
            });
          }
          break;
      }
    } else if (error.request) {
      // Network error - no response received
      if (showErrorNotification) {
        ToastNotifications.networkError();
      }
    } else {
      // Other errors (e.g., request setup errors)
      if (showErrorNotification) {
        ToastNotifications.error({
          title: 'Request Error',
          description: error.message || 'An unexpected error occurred',
        });
      }
    }

    return Promise.reject(error);
  }
);

export default api;
