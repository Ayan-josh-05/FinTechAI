import { AxiosError } from 'axios'

/**
 * Normalized application error shape. Hooks/pages should only ever see this,
 * never a raw AxiosError or unknown thrown value.
 */
export interface AppError {
  message: string
  status?: number
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'The request was invalid. Please check the submitted data and try again.',
  401: 'You are not authorized to perform this action. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource could not be found.',
  422: 'The submitted data could not be processed. Please check the details and try again.',
  500: 'The server encountered an error while processing your request. Please try again shortly.',
}

/**
 * Converts any thrown error (axios or otherwise) into a user-friendly message.
 * Never surfaces raw stack traces or internal error details.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED') {
      return 'The request timed out. Please try again.'
    }
    if (!error.response) {
      return 'Unable to reach the server. Please check your connection and try again.'
    }
    const status = error.response.status
    return STATUS_MESSAGES[status] ?? `Request failed with status ${status}. Please try again.`
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred. Please try again.'
}

/**
 * Builds a normalized AppError from any thrown error.
 */
export function toAppError(error: unknown): AppError {
  const message = getErrorMessage(error)
  const status = error instanceof AxiosError ? error.response?.status : undefined
  return { message, status }
}
