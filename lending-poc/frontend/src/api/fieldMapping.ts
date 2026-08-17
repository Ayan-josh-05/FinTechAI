import { apiClient } from './client'
import {
  fieldMappingResultSchema,
  type FieldMappingResult,
  type FieldMappingTemplateEntry,
} from '@/schemas/fieldMapping.schema'

export interface MapFieldsInput {
  /** This single document's translated (or OCR) text. */
  text: string
  /** This document's own template entry — one document per call, not the full template array. */
  template: FieldMappingTemplateEntry | unknown
}

/**
 * Calls the field-mapping API for a single document. The backend
 * (field_mapping_poc/api.py) accepts { ocr_text, json_format } — json_format
 * being the target schema encoded as a JSON string — one document at a time,
 * so this is invoked once per document (see useFieldMapping), mirroring how
 * OCR and translation each run per document.
 */
export async function mapFields(input: MapFieldsInput): Promise<FieldMappingResult> {
  const response = await apiClient.post('/map', {
    ocr_text: input.text,
    json_format: JSON.stringify(input.template),
  })

  return fieldMappingResultSchema.parse(response.data)
}
