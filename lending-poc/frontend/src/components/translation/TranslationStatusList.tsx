import { ProcessingDocumentCard } from '@/components/processing/ProcessingDocumentCard'
import type { Status } from '@/components/common/StatusBadge'
import { docTypeLabel } from '@/lib/documentTypes'
import type { UploadedDocument, TranslationEntry } from '@/store/useAppStore'

interface TranslationStatusListProps {
  documents: UploadedDocument[]
  translationResults: Record<string, TranslationEntry>
  onRetry: (documentId: string) => void
}

function toStatus(entry: TranslationEntry | undefined): Status {
  if (!entry) return 'PENDING'
  if (entry.status === 'processing') return 'PROCESSING'
  if (entry.status === 'success') return 'COMPLETED'
  if (entry.status === 'error') return 'FAILED'
  return 'PENDING'
}

export function TranslationStatusList({
  documents,
  translationResults,
  onRetry,
}: TranslationStatusListProps) {
  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const entry = translationResults[doc.id]
        return (
          <ProcessingDocumentCard
            key={doc.id}
            label={docTypeLabel(doc.docType)}
            fileName={doc.fileName}
            fileSize={doc.fileSize}
            status={toStatus(entry)}
            errorMessage={entry?.status === 'error' ? entry.error.message : undefined}
            onRetry={() => onRetry(doc.id)}
          />
        )
      })}
    </div>
  )
}
