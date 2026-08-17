interface ProcessingHeaderProps {
  totalCount: number
  completedCount: number
  failedCount: number
}

export function ProcessingHeader({
  totalCount,
  completedCount,
  failedCount,
}: ProcessingHeaderProps) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">OCR Processing</h2>
      <p className="mt-1.5 text-sm text-slate-600">
        Extracting text from {totalCount} document{totalCount === 1 ? '' : 's'}. {completedCount}{' '}
        completed{failedCount > 0 ? `, ${failedCount} failed` : ''}.
      </p>
    </div>
  )
}
