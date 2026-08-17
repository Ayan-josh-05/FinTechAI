import { cn } from '@/lib/utils'
import { docTypeLabel } from '@/lib/documentTypes'
import type { UploadedDocument, OcrEntry } from '@/store/useAppStore'

interface OCRDocumentSelectorProps {
  documents: UploadedDocument[]
  ocrResults: Record<string, OcrEntry>
  selectedId: string | null
  onSelect: (documentId: string) => void
}

export function OCRDocumentSelector({
  documents,
  ocrResults,
  selectedId,
  onSelect,
}: OCRDocumentSelectorProps) {
  return (
    <ul className="space-y-1.5">
      {documents.map((doc) => {
        const entry = ocrResults[doc.id]
        const succeeded = entry?.status === 'success'
        const failed = entry?.status === 'error'
        const isSelected = selectedId === doc.id
        return (
          <li key={doc.id}>
            <button
              type="button"
              onClick={() => onSelect(doc.id)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors',
                isSelected
                  ? 'border-brand-300 bg-brand-50 text-brand-900 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <span className="truncate">{docTypeLabel(doc.docType)}</span>
              <span
                aria-hidden="true"
                className={cn('shrink-0 text-xs', failed ? 'text-red-600' : 'text-emerald-600')}
              >
                {succeeded ? '✓' : failed ? '✕' : ''}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
