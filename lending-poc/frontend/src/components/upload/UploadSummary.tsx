import { DOCUMENT_TYPE_CONFIG } from '@/lib/documentTypes'
import type { UploadedDocument, DocType } from '@/store/useAppStore'

interface UploadSummaryProps {
  documents: Partial<Record<DocType, UploadedDocument>>
}

export function UploadSummary({ documents }: UploadSummaryProps) {
  const uploadedCount = DOCUMENT_TYPE_CONFIG.filter((c) => documents[c.docType]).length

  return (
    <p className="text-sm text-gray-600">
      {uploadedCount} of {DOCUMENT_TYPE_CONFIG.length} required documents uploaded
    </p>
  )
}
