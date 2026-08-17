import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { RequireStep } from '@/components/layout/RequireStep'
import { OCRDocumentSelector } from '@/components/ocr/OCRDocumentSelector'
import { OCRMetadata } from '@/components/ocr/OCRMetadata'
import { OCRViewer } from '@/components/ocr/OCRViewer'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/common/Button'

function OCRPageContent() {
  const navigate = useNavigate()
  const uploadedDocuments = useAppStore((s) => s.uploadedDocuments)
  const ocrResults = useAppStore((s) => s.ocrResults)
  const setCurrentStep = useAppStore((s) => s.setCurrentStep)

  const successfulDocs = uploadedDocuments.filter((doc) => ocrResults[doc.id]?.status === 'success')
  const [selectedId, setSelectedId] = useState<string | null>(successfulDocs[0]?.id ?? null)

  useEffect(() => {
    setCurrentStep('ocr')
  }, [setCurrentStep])

  const selectedDoc = uploadedDocuments.find((d) => d.id === selectedId)
  const selectedEntry = selectedId ? ocrResults[selectedId] : undefined

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">OCR Result</h2>
        <p className="mt-1 text-sm text-gray-600">
          Review the extracted content for each successfully processed document.
        </p>
      </div>

      {successfulDocs.length === 0 ? (
        <EmptyState
          title="No OCR results available"
          message="No documents were successfully processed. Go back to processing to retry."
          action={
            <Button type="button" onClick={() => navigate('/processing')}>
              Back to Processing
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
          <div className="sm:col-span-1">
            <OCRDocumentSelector
              documents={successfulDocs}
              ocrResults={ocrResults}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          <div className="space-y-4 sm:col-span-3">
            {selectedDoc && selectedEntry?.status === 'success' && (
              <>
                <OCRMetadata
                  filename={selectedEntry.data.filename}
                  fileType={selectedEntry.data.file_type}
                  pagesProcessed={selectedEntry.data.pages_processed}
                  processingEngine={selectedEntry.data.metadata.processing_engine}
                />
                <OCRViewer extraction={selectedEntry.data.extraction} />
              </>
            )}
            {!selectedDoc && (
              <EmptyState
                title="Select a document"
                message="Choose a document from the list to view its OCR result."
              />
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end border-t border-gray-200 pt-6">
        <Button
          type="button"
          disabled={successfulDocs.length === 0}
          onClick={() => navigate('/translation')}
        >
          Proceed to Translation
        </Button>
      </div>
    </div>
  )
}

export default function OCRPage() {
  return (
    <RequireStep step="ocr">
      <OCRPageContent />
    </RequireStep>
  )
}
