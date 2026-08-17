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
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-card sm:grid-cols-4">
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Filename</dt>
        <dd className="mt-0.5 truncate font-medium text-slate-800" title={filename}>
          {filename}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">File Type</dt>
        <dd className="mt-0.5 font-medium text-slate-800">{fileType}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Pages Processed
        </dt>
        <dd className="mt-0.5 font-medium text-slate-800">{pagesProcessed}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Engine</dt>
        <dd className="mt-0.5 font-medium text-slate-800">{processingEngine}</dd>
      </div>
    </dl>
  )
}
