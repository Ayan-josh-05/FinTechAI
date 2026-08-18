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

  // Each branch below caps progress at the step whose own success condition
  // is still unmet — whether that's because it hasn't been attempted yet or
  // because every attempt so far has failed. Landing on that step is what
  // triggers the attempt (translation and validation auto-run on mount;
  // field-mapping is manually triggered from that same page), so the cap
  // must allow reaching the step itself, not stop one step short of it.
  const hasAnyOcrSuccess = Object.values(state.ocrResults).some((e) => e.status === 'success')
  if (!hasAnyOcrSuccess) return 1 // processing (auto-runs OCR)

  const hasAnyTranslationSuccess = Object.values(state.translationResults).some(
    (e) => e.status === 'success'
  )
  if (!hasAnyTranslationSuccess) return 3 // translation (auto-runs on mount)

  const hasAnyFieldMappingSuccess = Object.values(state.fieldMappingResults).some(
    (e) => e.status === 'success'
  )
  if (!hasAnyFieldMappingSuccess) return 4 // field-mapping (manual "Generate")

  if (!state.validationResult) return 5 // validation (auto-runs on mount)

  return 5
}
