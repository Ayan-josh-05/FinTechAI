interface OCRMetadataProps {
  filename: string
  fileType: string
  pagesProcessed: number
  processingEngine: string
}

export function OCRMetadata({
  filename,
  fileType,
  pagesProcessed,
  processingEngine,
}: OCRMetadataProps) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-gray-200 bg-white p-4 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Filename</dt>
        <dd className="mt-0.5 truncate text-gray-800" title={filename}>
          {filename}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">File Type</dt>
        <dd className="mt-0.5 text-gray-800">{fileType}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Pages Processed
        </dt>
        <dd className="mt-0.5 text-gray-800">{pagesProcessed}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Engine</dt>
        <dd className="mt-0.5 text-gray-800">{processingEngine}</dd>
      </div>
    </dl>
  )
}
