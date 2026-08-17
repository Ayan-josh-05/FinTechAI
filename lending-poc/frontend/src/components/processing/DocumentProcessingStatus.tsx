import { ProcessingDocumentCard } from './ProcessingDocumentCard'
import type { Status } from '@/components/common/StatusBadge'
import { docTypeLabel } from '@/lib/documentTypes'
import type { UploadedDocument, OcrEntry } from '@/store/useAppStore'

interface DocumentProcessingStatusProps {
  documents: UploadedDocument[]
  ocrResults: Record<string, OcrEntry>
  onRetry: (documentId: string) => void
}

function toStatus(entry: OcrEntry | undefined): Status {
  if (!entry) return 'PENDING'
  if (entry.status === 'processing') return 'PROCESSING'
  if (entry.status === 'success') return 'COMPLETED'
  if (entry.status === 'error') return 'FAILED'
  return 'PENDING'
}

export function DocumentProcessingStatus({
  documents,
  ocrResults,
  onRetry,
}: DocumentProcessingStatusProps) {
  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const entry = ocrResults[doc.id]
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
