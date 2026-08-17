import { DOCUMENT_TYPE_CONFIG } from '@/lib/documentTypes'
import { cn } from '@/lib/utils'
import type { UploadedDocument, DocType } from '@/store/useAppStore'

interface UploadSummaryProps {
  documents: Partial<Record<DocType, UploadedDocument>>
}

export function UploadSummary({ documents }: UploadSummaryProps) {
  const total = DOCUMENT_TYPE_CONFIG.length
  const uploadedCount = DOCUMENT_TYPE_CONFIG.filter((c) => documents[c.docType]).length
  const complete = uploadedCount === total

  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 sm:w-32">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            complete ? 'bg-emerald-500' : 'bg-brand-500'
          )}
          style={{ width: `${(uploadedCount / total) * 100}%` }}
        />
      </div>
      <p className="text-sm font-medium text-slate-600">
        {uploadedCount} of {total} required documents uploaded
      </p>
    </div>
  )
}
