import { apiClient } from './client'
import {
  caseCreateResponseSchema,
  type CaseCreateRequest,
  type CaseCreateResponse,
} from '@/schemas/validation.schema'

/**
 * Submits a case for validation against POST /cases.
 */
export async function createCase(payload: CaseCreateRequest): Promise<CaseCreateResponse> {
  const response = await apiClient.post('/cases', payload)
  return caseCreateResponseSchema.parse(response.data)
}
