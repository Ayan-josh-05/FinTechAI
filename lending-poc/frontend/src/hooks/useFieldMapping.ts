import { useCallback, useState } from 'react'
import { mapFields } from '@/api/fieldMapping'
import { useAppStore, type UploadedDocument } from '@/store/useAppStore'
import { toAppError } from '@/lib/errors'
import { getFieldMappingTemplateFor } from '@/lib/fieldMappingTemplate'

/**
 * Drives field mapping for each document individually — the backend accepts
 * one document's { text, template } per call, never a combined batch — so
 * this mirrors the per-document status pattern used by useOCR/useTranslation.
 *
 * The "endpoint not configured" error is an expected, handled state per
 * document — not a crash — so the page can render an informative status
 * instead of a broken screen.
 */
export function useFieldMapping() {
  const uploadedDocuments = useAppStore((s) => s.uploadedDocuments)
  const translationResults = useAppStore((s) => s.translationResults)
  const fieldMappingResults = useAppStore((s) => s.fieldMappingResults)
  const setFieldMappingEntry = useAppStore((s) => s.setFieldMappingEntry)
  const [isRunning, setIsRunning] = useState(false)

  const mapOne = useCallback(
    async (doc: UploadedDocument) => {
      const translationEntry = translationResults[doc.id]
      if (!translationEntry || translationEntry.status !== 'success') return

      setFieldMappingEntry(doc.id, { status: 'processing' })
      try {
        const template = getFieldMappingTemplateFor(doc.docType)
        const result = await mapFields({ text: translationEntry.data.translation, template })
        setFieldMappingEntry(doc.id, { status: 'success', data: result })
      } catch (error) {
        setFieldMappingEntry(doc.id, { status: 'error', error: toAppError(error) })
      }
    },
    [translationResults, setFieldMappingEntry]
  )

  const startAll = useCallback(() => {
    setIsRunning(true)
    const eligible = uploadedDocuments.filter(
      (doc) => translationResults[doc.id]?.status === 'success'
    )
    Promise.allSettled(eligible.map((doc) => mapOne(doc))).finally(() => {
      setIsRunning(false)
    })
  }, [uploadedDocuments, translationResults, mapOne])

  const retryOne = useCallback(
    (documentId: string) => {
      const doc = uploadedDocuments.find((d) => d.id === documentId)
      if (!doc) return
      void mapOne(doc)
    },
    [uploadedDocuments, mapOne]
  )

  return { uploadedDocuments, fieldMappingResults, isRunning, startAll, retryOne }
}
