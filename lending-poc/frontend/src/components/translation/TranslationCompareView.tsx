import { HtmlDocumentViewer } from '@/components/common/HtmlDocumentViewer'
import type { ExtractResponse } from '@/schemas/extract.schema'

interface TranslationCompareViewProps {
  original: ExtractResponse
  translatedText: string
}

/**
 * Side-by-side original OCR result vs. translated text, reusing
 * HtmlDocumentViewer for both (html mode for original when available,
 * text mode for the plain-text translation result).
 */
export function TranslationCompareView({ original, translatedText }: TranslationCompareViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Original (OCR)
        </p>
        {original.extraction.html ? (
          <HtmlDocumentViewer mode="html" html={original.extraction.html} />
        ) : (
          <HtmlDocumentViewer mode="text" text={original.extraction.text} />
        )}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Translated
        </p>
        <HtmlDocumentViewer mode="text" text={translatedText} />
      </div>
    </div>
  )
}
