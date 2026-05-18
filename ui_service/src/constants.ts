export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Returns the full API endpoint with the backend URL prefixed
 * @param endpoint - The API endpoint path (e.g., '/auth/register')
 * @returns The complete API URL
 */
export const getAPIendpoint = (endpoint: string): string => {

  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};
