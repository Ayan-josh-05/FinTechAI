import { Spinner } from '@/components/common/Spinner'
import { StatusBadge, type Status } from '@/components/common/StatusBadge'
import { Button } from '@/components/common/Button'
import { formatFileSize } from '@/lib/documentTypes'

interface ProcessingDocumentCardProps {
  label: string
  fileName: string
  fileSize: number
  status: Status
  errorMessage?: string
  onRetry?: () => void
}

export function ProcessingDocumentCard({
  label,
  fileName,
  fileSize,
  status,
  errorMessage,
  onRetry,
}: ProcessingDocumentCardProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="truncate text-xs text-gray-500" title={fileName}>
          {fileName} · {formatFileSize(fileSize)}
        </p>
        {status === 'FAILED' && errorMessage && (
          <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {status === 'PROCESSING' && <Spinner />}
        <StatusBadge status={status} />
        {status === 'FAILED' && onRetry && (
          <Button
            type="button"
            onClick={onRetry}
            className="bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
