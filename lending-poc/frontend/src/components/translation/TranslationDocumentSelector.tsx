import { cn } from '@/lib/utils'
import { docTypeLabel } from '@/lib/documentTypes'
import type { UploadedDocument, TranslationEntry } from '@/store/useAppStore'

interface TranslationDocumentSelectorProps {
  documents: UploadedDocument[]
  translationResults: Record<string, TranslationEntry>
  selectedId: string | null
  onSelect: (documentId: string) => void
}

export function TranslationDocumentSelector({
  documents,
  translationResults,
  selectedId,
  onSelect,
}: TranslationDocumentSelectorProps) {
  return (
    <ul className="space-y-2">
      {documents.map((doc) => {
        const entry = translationResults[doc.id]
        const succeeded = entry?.status === 'success'
        const failed = entry?.status === 'error'
        return (
          <li key={doc.id}>
            <button
              type="button"
              onClick={() => onSelect(doc.id)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm',
                selectedId === doc.id
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              <span className="truncate">{docTypeLabel(doc.docType)}</span>
              <span aria-hidden="true" className={failed ? 'text-red-600' : 'text-green-600'}>
                {succeeded ? '✓' : failed ? '✕' : ''}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
