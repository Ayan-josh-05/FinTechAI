import { useCallback, useId, useRef, useState, type DragEvent } from 'react'
import { cn } from '@/lib/utils'
import { ACCEPTED_FILE_EXTENSIONS } from '@/lib/documentTypes'

interface DocumentDropzoneProps {
  label: string
  onFileSelected: (file: File) => void
  error?: string
}

/**
 * Drag-and-drop + browse target for a single document slot.
 */
export function DocumentDropzone({ label, onFileSelected, error }: DocumentDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragActive(false)
      const file = event.dataTransfer.files[0]
      if (file) onFileSelected(file)
    },
    [onFileSelected]
  )

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragActive(true)
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors',
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50',
          error && 'border-red-400'
        )}
      >
        <p className="text-sm font-medium text-gray-700">Drag &amp; drop {label} here</p>
        <p className="mt-1 text-xs text-gray-500">or click to browse</p>
        <p className="mt-2 text-xs text-gray-400">
          Accepted: {ACCEPTED_FILE_EXTENSIONS.join(', ')} — up to 50MB
        </p>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        accept={ACCEPTED_FILE_EXTENSIONS.join(',')}
        aria-label={`Browse for ${label} file`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelected(file)
          e.target.value = ''
        }}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
