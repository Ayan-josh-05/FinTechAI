import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOCR } from '@/hooks/useOCR'
import { useAppStore } from '@/store/useAppStore'
import { RequireStep } from '@/components/layout/RequireStep'
import { ProcessingHeader } from '@/components/processing/ProcessingHeader'
import { DocumentProcessingStatus } from '@/components/processing/DocumentProcessingStatus'
import { Button } from '@/components/common/Button'

function ProcessingPageContent() {
  const navigate = useNavigate()
  const { uploadedDocuments, ocrResults, isRunning, startAll, retryOne } = useOCR()
  const setCurrentStep = useAppStore((s) => s.setCurrentStep)
  // Guards against React StrictMode's dev-only double-invoke of mount
  // effects: both invocations share the same closure-captured ocrResults
  // (empty, since neither has resolved yet), so a check like
  // `hasAnyAttempt` alone would pass both times and fire startAll() twice
  // — two overlapping batches racing each other, each internally
  // sequential but not against one another. A ref survives the
  // double-invoke, so it reliably fires once.
  const hasStartedRef = useRef(false)

  useEffect(() => {
    setCurrentStep('processing')
    // Kick off extraction once, on mount, if nothing has been attempted yet.
    const hasAnyAttempt = uploadedDocuments.some((doc) => ocrResults[doc.id])
    if (!hasAnyAttempt && !hasStartedRef.current) {
      hasStartedRef.current = true
      startAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, [])

  const { completedCount, failedCount, allSettled } = useMemo(() => {
    let completed = 0
    let failed = 0
    let settled = 0
    uploadedDocuments.forEach((doc) => {
      const entry = ocrResults[doc.id]
      if (entry?.status === 'success') {
        completed++
        settled++
      } else if (entry?.status === 'error') {
        failed++
        settled++
      }
    })
    return {
      completedCount: completed,
      failedCount: failed,
      allSettled: settled === uploadedDocuments.length,
    }
  }, [uploadedDocuments, ocrResults])

  const canProceed = allSettled && completedCount > 0 && !isRunning

  return (
    <div className="space-y-6">
      <ProcessingHeader
        totalCount={uploadedDocuments.length}
        completedCount={completedCount}
        failedCount={failedCount}
      />

      <DocumentProcessingStatus
        documents={uploadedDocuments}
        ocrResults={ocrResults}
        onRetry={retryOne}
      />

      {allSettled && failedCount > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {failedCount} document{failedCount === 1 ? '' : 's'} failed to process. You can retry them
          above, or proceed with the documents that succeeded.
        </p>
      )}

      <div className="flex justify-end border-t border-slate-200 pt-6">
        <Button type="button" disabled={!canProceed} onClick={() => navigate('/ocr')}>
          View OCR Results →
        </Button>
      </div>
    </div>
  )
}

export default function ProcessingPage() {
  return (
    <RequireStep step="processing">
      <ProcessingPageContent />
    </RequireStep>
  )
}
