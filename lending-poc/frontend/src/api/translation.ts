import { translationApiClient } from './client'
import { translationResponseSchema, type TranslationResult } from '@/schemas/translation.schema'

/**
 * Translates a block of OCR-extracted text via the translation microservice.
 * Domain is always "banking" for this app — not configurable per document.
 * Only extraction.text should ever be passed here, never extraction.html.
 */
export async function translateText(text: string): Promise<TranslationResult> {
  const response = await translationApiClient.post('/translate/text', {
    text,
    domain: 'banking',
  })

  return translationResponseSchema.parse(response.data).result
}
