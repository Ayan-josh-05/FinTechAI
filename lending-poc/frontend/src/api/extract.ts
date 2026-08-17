import { apiClient } from './client'
import { extractResponseSchema, type ExtractResponse } from '@/schemas/extract.schema'
import { toAppError, type AppError } from '@/lib/errors'

/**
 * Result of attempting to extract a single file. Either the parsed
 * ExtractResponse, or a normalized error — callers should not throw on a
 * per-file failure since one failure must not kill the others.
 */
export type ExtractFileResult =
  | { status: 'fulfilled'; file: File; data: ExtractResponse }
  | { status: 'rejected'; file: File; error: AppError }

/**
 * POSTs a single file to /extract. The backend processes one file per call,
 * and the required multipart field name is "File" (capital F) — this is a
 * deliberate backend contract requirement, not a typo.
 */
async function extractOne(file: File): Promise<ExtractResponse> {
  const formData = new FormData()
  formData.append('File', file)

  const response = await apiClient.post('/extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return extractResponseSchema.parse(response.data)
}

/**
 * Extracts OCR data for each file individually (the backend only accepts
 * one file per request). Uses allSettled so a single failure doesn't
 * prevent the other documents from completing.
 */
export async function extractDocuments(files: File[]): Promise<ExtractFileResult[]> {
  const settled = await Promise.allSettled(files.map((file) => extractOne(file)))

  return settled.map((result, index) => {
    const file = files[index]
    if (result.status === 'fulfilled') {
      return { status: 'fulfilled', file, data: result.value }
    }
    return { status: 'rejected', file, error: toAppError(result.reason) }
  })
}
