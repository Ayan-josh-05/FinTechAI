import axios from 'axios'
import { env } from '@/config/env'
import { toAppError } from '@/lib/errors'

export const apiClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalize all errors to a user-friendly AppError shape before they
    // reach hooks/pages. Never leak raw axios/stack details to the UI.
    return Promise.reject(toAppError(error))
  }
)

/**
 * Separate client for the translation microservice, which lives on its own
 * host:port (VITE_TRANSLATION_API_BASE_URL), distinct from the main API.
 */
export const translationApiClient = axios.create({
  baseURL: env.VITE_TRANSLATION_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

translationApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(toAppError(error))
  }
)
