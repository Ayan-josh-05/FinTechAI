import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFieldMapping } from '@/hooks/useFieldMapping'
import { useAppStore } from '@/store/useAppStore'
import { RequireStep } from '@/components/layout/RequireStep'
import { FieldMappingDocumentCard } from '@/components/field-mapping/FieldMappingDocumentCard'
import { Button } from '@/components/common/Button'

function FieldMappingPageContent() {
  const navigate = useNavigate()
  const setCurrentStep = useAppStore((s) => s.setCurrentStep)
  const ocrResults = useAppStore((s) => s.ocrResults)
  const { uploadedDocuments, fieldMappingResults, isRunning, startAll, retryOne } =
    useFieldMapping()

  const eligibleDocs = uploadedDocuments.filter((doc) => ocrResults[doc.id]?.status === 'success')

  useEffect(() => {
    setCurrentStep('field-mapping')
    // Templates are shown immediately; mapping only runs when the user
    // clicks "Generate All" or an individual card's "Generate" button.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, [])

  const successCount = eligibleDocs.filter(
    (doc) => fieldMappingResults[doc.id]?.status === 'success'
  ).length
  const canProceed = successCount > 0 && !isRunning

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Field Mapping</h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Each document has its own field-mapping template. Generate all at once, or generate a
          single document individually.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={startAll}
          disabled={isRunning || eligibleDocs.length === 0}
        >
          {isRunning ? 'Generating…' : 'Generate All'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {eligibleDocs.map((doc) => (
          <FieldMappingDocumentCard
            key={doc.id}
            docType={doc.docType}
            entry={fieldMappingResults[doc.id]}
            onGenerate={() => retryOne(doc.id)}
          />
        ))}
      </div>

      <div className="flex justify-end border-t border-slate-200 pt-6">
        <Button type="button" disabled={!canProceed} onClick={() => navigate('/validation')}>
          Proceed to Data Validation →
        </Button>
      </div>
    </div>
  )
}

export default function FieldMappingPage() {
  return (
    <RequireStep step="field-mapping">
      <FieldMappingPageContent />
    </RequireStep>
  )
}
