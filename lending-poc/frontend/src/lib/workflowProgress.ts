import type { useAppStore } from '@/store/useAppStore'

type AppStoreState = ReturnType<typeof useAppStore.getState>

/**
 * Computes the furthest workflow step index the user's current state
 * legitimately allows them to reach. Used both to gate the stepper's
 * clickable steps and to redirect users who try to jump ahead via direct
 * navigation.
 */
export function getMaxReachedIndex(state: AppStoreState): number {
  const hasUploads = state.uploadedDocuments.length > 0
  if (!hasUploads) return 0 // upload

  const ocrEntries = Object.values(state.ocrResults)
  const hasAnyOcrAttempt = ocrEntries.length > 0
  if (!hasAnyOcrAttempt) return 1 // processing

  const hasAnyOcrSuccess = ocrEntries.some((e) => e.status === 'success')
  if (!hasAnyOcrSuccess) return 1 // processing (all failed so far)

  const translationEntries = Object.values(state.translationResults)
  const hasAnyTranslationAttempt = translationEntries.length > 0
  if (!hasAnyTranslationAttempt) return 2 // ocr

  const hasAnyTranslationSuccess = translationEntries.some((e) => e.status === 'success')
  if (!hasAnyTranslationSuccess) return 2 // ocr

  const fieldMappingEntries = Object.values(state.fieldMappingResults)
  const hasAnyFieldMappingAttempt = fieldMappingEntries.length > 0
  if (!hasAnyFieldMappingAttempt) return 3 // translation

  const hasAnyFieldMappingSuccess = fieldMappingEntries.some((e) => e.status === 'success')
  if (!hasAnyFieldMappingSuccess) return 3 // translation

  if (!state.validationResult) return 4 // field-mapping

  return 5 // validation
}
