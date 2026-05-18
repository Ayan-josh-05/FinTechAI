/**
 * Splits content at empty array markers ([]) and identifies markdown segments
 * Markdown segments are content that appears before [] markers
 */
export interface MarkdownSegment {
  content: string
  isMarkdown: boolean
}

export function splitMarkdownAtEmptyArray(content: string): Array<MarkdownSegment> {
  if (!content) return []

  const segments: Array<MarkdownSegment> = []
  let currentIndex = 0
  const emptyArrayMarker = '[]'

  while (currentIndex < content.length) {
    const markerIndex = content.indexOf(emptyArrayMarker, currentIndex)

    if (markerIndex === -1) {
      // No more markers, add remaining content
      const remaining = content.substring(currentIndex).trim()
      if (remaining) {
        // Check if remaining content looks like markdown (starts with #)
        const isMarkdown = /^\s*#/.test(remaining)
        segments.push({
          content: remaining,
          isMarkdown,
        })
      }
      break
    }

    // Content before the marker
    const beforeMarker = content.substring(currentIndex, markerIndex).trim()
    if (beforeMarker) {
      // Content before [] is typically markdown
      segments.push({
        content: beforeMarker,
        isMarkdown: true,
      })
    }

    // Skip the marker and continue
    currentIndex = markerIndex + emptyArrayMarker.length
  }

  // If no segments were created, treat entire content as markdown if it starts with #
  if (segments.length === 0 && content.trim()) {
    const isMarkdown = /^\s*#/.test(content.trim())
    segments.push({
      content: content.trim(),
      isMarkdown,
    })
  }

  return segments
}

