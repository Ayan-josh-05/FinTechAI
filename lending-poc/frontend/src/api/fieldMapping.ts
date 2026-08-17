import type { FieldMappingResult, FieldMappingTemplateEntry } from '@/schemas/fieldMapping.schema'

export interface MapFieldsInput {
  /** This single document's translated (or OCR) text. */
  text: string
  /** This document's own template entry — one document per call, not the full template array. */
  template: FieldMappingTemplateEntry | unknown
}

/**
 * Calls the field-mapping API for a single document. The backend accepts one
 * document's { text, template } at a time — never the full 4-document batch
 * — so this is invoked once per document (see useFieldMapping), mirroring
 * how OCR and translation each run per document.
 *
 * NOT YET CONFIGURED: the field-mapping endpoint has not been provided by
 * the backend team. This throws a descriptive error so the UI can surface
 * an expected "not yet available" state rather than crashing on a fake URL.
 *
 * Once the contract lands, implement it roughly as follows:
 *
 *   import { fieldMappingApiClient } from './client' // new client, mirrors translationApiClient
 *   import { env } from '@/config/env' // add VITE_FIELD_MAPPING_API_BASE_URL to env schema
 *   import { fieldMappingResultSchema } from '@/schemas/fieldMapping.schema'
 *
 *   export async function mapFields(input: MapFieldsInput): Promise<FieldMappingResult> {
 *     const response = await fieldMappingApiClient.post('/field-mapping', input)
 *     return fieldMappingResultSchema.parse(response.data)
 *   }
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept in the signature so callers/hooks don't need to change once the real call is implemented
export function mapFields(_input: MapFieldsInput): Promise<FieldMappingResult> {
  return Promise.reject(
    new Error(
      'Field Mapping API endpoint is not yet configured. Set VITE_FIELD_MAPPING_API_BASE_URL and implement this call once the backend contract is provided.'
    )
  )
}
