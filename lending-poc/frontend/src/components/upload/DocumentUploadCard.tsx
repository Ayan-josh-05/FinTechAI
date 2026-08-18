import { DocumentDropzone } from './DocumentDropzone'
import { UploadedFileCard } from './UploadedFileCard'
import type { UploadedDocument } from '@/store/useAppStore'

interface DocumentUploadCardProps {
  label: string
  document: UploadedDocument | undefined
  error?: string
  onSelect: (file: File) => void
  onRemove: () => void
}

/**
 * A single optional-document slot: shows either the dropzone or the
 * uploaded file's metadata card, depending on whether a file is present.
 */
export function DocumentUploadCard({
  label,
  document,
  error,
  onSelect,
  onRemove,
}: DocumentUploadCardProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-800">{label}</p>
      {document ? (
        <UploadedFileCard
          fileName={document.fileName}
          fileSize={document.fileSize}
          fileType={document.fileType}
          onRemove={onRemove}
          onReplace={() => onRemove()}
        />
      ) : (
        <DocumentDropzone label={label} onFileSelected={onSelect} error={error} />
      )}
    </div>
  )
}
