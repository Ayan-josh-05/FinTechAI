import { Spinner } from '@/components/common/Spinner'
import { StatusBadge, type Status } from '@/components/common/StatusBadge'
import { Button } from '@/components/common/Button'
import { formatFileSize } from '@/lib/documentTypes'
import { cn } from '@/lib/utils'

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
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3.5 shadow-card transition-colors',
        status === 'FAILED' ? 'border-red-200' : 'border-slate-200'
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="truncate text-xs text-slate-500" title={fileName}>
          {fileName} · {formatFileSize(fileSize)}
        </p>
        {status === 'FAILED' && errorMessage && (
          <p className="mt-1 text-xs font-medium text-red-600">{errorMessage}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {status === 'PROCESSING' && <Spinner />}
        <StatusBadge status={status} />
        {status === 'FAILED' && onRetry && (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
