import { z } from 'zod'

export const translationRequestSchema = z.object({
  text: z.string(),
  domain: z.literal('banking'),
})

export type TranslationRequest = z.infer<typeof translationRequestSchema>

export const translationResponseSchema = z.object({
  result: z.object({
    source: z.string(),
    domain: z.string(),
    translation: z.string(),
    kb_matches: z.number(),
  }),
})

export type TranslationResponse = z.infer<typeof translationResponseSchema>
export type TranslationResult = TranslationResponse['result']
