import { useCallback, useState } from 'react'
import { translateText } from '@/api/translation'
import { useAppStore, type UploadedDocument } from '@/store/useAppStore'
import { toAppError } from '@/lib/errors'

/**
 * Drives translation for each document's OCR text. Only extraction.text is
 * ever sent (never extraction.html). Populates translationResults keyed by
 * document id, mirroring the per-document status pattern used by useOCR.
 */
export function useTranslation() {
  const uploadedDocuments = useAppStore((s) => s.uploadedDocuments)
  const ocrResults = useAppStore((s) => s.ocrResults)
  const translationResults = useAppStore((s) => s.translationResults)
  const setTranslationEntry = useAppStore((s) => s.setTranslationEntry)
  const [isRunning, setIsRunning] = useState(false)

  const translateOne = useCallback(
    async (doc: UploadedDocument) => {
      const ocrEntry = ocrResults[doc.id]
      if (!ocrEntry || ocrEntry.status !== 'success') return

      setTranslationEntry(doc.id, { status: 'processing' })
      try {
        const result = await translateText(ocrEntry.data.extraction.text)
        setTranslationEntry(doc.id, { status: 'success', data: result })
      } catch (error) {
        setTranslationEntry(doc.id, { status: 'error', error: toAppError(error) })
      }
    },
    [ocrResults, setTranslationEntry]
  )

  const startAll = useCallback(() => {
    setIsRunning(true)
    const eligible = uploadedDocuments.filter((doc) => ocrResults[doc.id]?.status === 'success')
    Promise.allSettled(eligible.map((doc) => translateOne(doc))).finally(() => {
      setIsRunning(false)
    })
  }, [uploadedDocuments, ocrResults, translateOne])

  const retryOne = useCallback(
    (documentId: string) => {
      const doc = uploadedDocuments.find((d) => d.id === documentId)
      if (!doc) return
      void translateOne(doc)
    },
    [uploadedDocuments, translateOne]
  )

  return { uploadedDocuments, translationResults, isRunning, startAll, retryOne }
}
