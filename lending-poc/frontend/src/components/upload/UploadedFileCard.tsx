import { formatFileSize } from '@/lib/documentTypes'
import { Button } from '@/components/common/Button'

interface UploadedFileCardProps {
  fileName: string
  fileSize: number
  fileType: string
  onRemove: () => void
  onReplace: () => void
}

export function UploadedFileCard({
  fileName,
  fileSize,
  fileType,
  onRemove,
  onReplace,
}: UploadedFileCardProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <span aria-hidden="true">✓</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900" title={fileName}>
            {fileName}
          </p>
          <p className="text-xs text-slate-500">
            {formatFileSize(fileSize)} · {fileType || 'unknown type'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onReplace}>
          Replace
        </Button>
        <Button type="button" variant="danger" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  )
}
