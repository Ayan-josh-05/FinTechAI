import type { SemanticSearchResultById } from '@/features/SemanticSearch/api'

/**
 * Checks if a semantic search response has any content
 * @param result - The semantic search result to check
 * @returns true if the response has content (introduction or elements), false otherwise
 */
export const hasResponseContent = (
  result: SemanticSearchResultById | null | undefined,
): boolean => {
  if (!result?.answer) return false

  const hasIntroduction =
    result.answer.introduction && result.answer.introduction.trim() !== ''
  const hasElements =
    result.answer.elements && result.answer.elements.length > 0

  return hasIntroduction || hasElements
}
