import { useState } from 'react'
import { HtmlDocumentViewer } from '@/components/common/HtmlDocumentViewer'
import { Button } from '@/components/common/Button'
import type { ExtractResponse } from '@/schemas/extract.schema'

interface OCRViewerProps {
  extraction: ExtractResponse['extraction']
}

/**
 * Renders extraction.html when present; otherwise shows a graceful empty
 * state with a toggle to view the raw extracted text instead of crashing
 * or rendering blank (the backend currently doesn't return html at all).
 */
export function OCRViewer({ extraction }: OCRViewerProps) {
  const [showText, setShowText] = useState(!extraction.html)

  if (!extraction.html) {
    return (
      <div>
        <p className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          HTML preview not available for this document. Showing extracted text instead.
        </p>
        <HtmlDocumentViewer mode="text" text={extraction.text} />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button
          type="button"
          onClick={() => setShowText((v) => !v)}
          className="bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
        >
          {showText ? 'View HTML' : 'View Text'}
        </Button>
      </div>
      {showText ? (
        <HtmlDocumentViewer mode="text" text={extraction.text} />
      ) : (
        <HtmlDocumentViewer mode="html" html={extraction.html} />
      )}
    </div>
  )
}
