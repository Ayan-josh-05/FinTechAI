import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { useAppStore } from '@/store/useAppStore'
import { RequireStep } from '@/components/layout/RequireStep'
import { TranslationStatusList } from '@/components/translation/TranslationStatusList'
import { TranslationDocumentSelector } from '@/components/translation/TranslationDocumentSelector'
import { TranslationCompareView } from '@/components/translation/TranslationCompareView'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/common/Button'

function TranslationPageContent() {
  const navigate = useNavigate()
  const { uploadedDocuments, translationResults, isRunning, startAll, retryOne, skipAll } =
    useTranslation()
  const ocrResults = useAppStore((s) => s.ocrResults)
  const setCurrentStep = useAppStore((s) => s.setCurrentStep)

  const eligibleDocs = uploadedDocuments.filter((doc) => ocrResults[doc.id]?.status === 'success')
  // Guards against React StrictMode's dev-only double-invoke of mount
  // effects: both invocations share the same closure-captured
  // translationResults (empty, since neither has resolved yet), so a check
  // like `hasAnyAttempt` alone would pass both times and fire startAll()
  // twice — two overlapping batches racing each other. A ref survives the
  // double-invoke, so it reliably fires once.
  const hasStartedRef = useRef(false)

  useEffect(() => {
    setCurrentStep('translation')
    const hasAnyAttempt = eligibleDocs.some((doc) => translationResults[doc.id])
    if (!hasAnyAttempt && eligibleDocs.length > 0 && !hasStartedRef.current) {
      hasStartedRef.current = true
      startAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, [])

  const handleSkip = () => {
    skipAll()
    navigate('/field-mapping')
  }

  const successfulDocs = eligibleDocs.filter(
    (doc) => translationResults[doc.id]?.status === 'success'
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const effectiveSelectedId = selectedId ?? successfulDocs[0]?.id ?? null
  const selectedDoc = eligibleDocs.find((d) => d.id === effectiveSelectedId)
  const selectedOcrEntry = effectiveSelectedId ? ocrResults[effectiveSelectedId] : undefined
  const selectedTranslationEntry = effectiveSelectedId
    ? translationResults[effectiveSelectedId]
    : undefined

  const { completedCount, allSettled } = useMemo(() => {
    let completed = 0
    let settled = 0
    eligibleDocs.forEach((doc) => {
      const entry = translationResults[doc.id]
      if (entry?.status === 'success') {
        completed++
        settled++
      } else if (entry?.status === 'error') {
        settled++
      }
    })
    return { completedCount: completed, allSettled: settled === eligibleDocs.length }
  }, [eligibleDocs, translationResults])

  const canProceed = allSettled && completedCount > 0 && !isRunning

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Translation</h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Translating the extracted text for each document (banking domain).
        </p>
      </div>

      <TranslationStatusList
        documents={eligibleDocs}
        translationResults={translationResults}
        onRetry={retryOne}
      />

      {successfulDocs.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
          <div className="sm:col-span-1">
            <TranslationDocumentSelector
              documents={successfulDocs}
              translationResults={translationResults}
              selectedId={effectiveSelectedId}
              onSelect={setSelectedId}
            />
          </div>
          <div className="sm:col-span-3">
            {selectedDoc &&
            selectedOcrEntry?.status === 'success' &&
            selectedTranslationEntry?.status === 'success' ? (
              <TranslationCompareView
                original={selectedOcrEntry.data}
                translatedText={selectedTranslationEntry.data.translation}
              />
            ) : (
              <EmptyState
                title="Select a document"
                message="Choose a document to compare original and translated text."
              />
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
        <Button
          type="button"
          variant="secondary"
          disabled={eligibleDocs.length === 0 || isRunning}
          onClick={handleSkip}
        >
          Skip Translation (documents are already English) →
        </Button>
        <Button type="button" disabled={!canProceed} onClick={() => navigate('/field-mapping')}>
          Proceed to Field Mapping →
        </Button>
      </div>
    </div>
  )
}

export default function TranslationPage() {
  return (
    <RequireStep step="translation">
      <TranslationPageContent />
    </RequireStep>
  )
}
