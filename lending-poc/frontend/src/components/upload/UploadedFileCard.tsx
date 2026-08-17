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
    <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900" title={fileName}>
          {fileName}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(fileSize)} · {fileType || 'unknown type'}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          onClick={onReplace}
          className="bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
        >
          Replace
        </Button>
        <Button
          type="button"
          onClick={onRemove}
          className="bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
        >
          Remove
        </Button>
      </div>
    </div>
  )
}
