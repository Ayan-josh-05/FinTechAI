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

  const runTranslation = useCallback(
    async (docs: UploadedDocument[]) => {
      if (docs.length === 0) return
      setIsRunning(true)
      // The backend serializes translation requests (the local model only
      // handles one generation at a time), so sending them one at a time
      // avoids every request's timeout clock starting at once and piling
      // up behind the same queue.
      for (const doc of docs) {
        await translateOne(doc)
      }
      setIsRunning(false)
    },
    [translateOne]
  )

  const startAll = useCallback(() => {
    const eligible = uploadedDocuments.filter((doc) => ocrResults[doc.id]?.status === 'success')
    void runTranslation(eligible)
  }, [runTranslation, uploadedDocuments, ocrResults])

  const retryOne = useCallback(
    (documentId: string) => {
      const doc = uploadedDocuments.find((d) => d.id === documentId)
      if (!doc) return
      void translateOne(doc)
    },
    [uploadedDocuments, translateOne]
  )

  /**
   * Skips translation for all eligible documents, carrying the OCR text
   * through unchanged as the "translation" (for already-English documents,
   * where a real translation call would be a no-op). Field mapping reads
   * translationResults[id].data.translation, so this keeps the rest of the
   * pipeline working without any changes downstream.
   */
  const skipAll = useCallback(() => {
    uploadedDocuments.forEach((doc) => {
      const ocrEntry = ocrResults[doc.id]
      if (!ocrEntry || ocrEntry.status !== 'success') return
      setTranslationEntry(doc.id, {
        status: 'success',
        data: {
          source: 'skipped',
          domain: 'banking',
          translation: ocrEntry.data.extraction.text,
          kb_matches: 0,
        },
      })
    })
  }, [uploadedDocuments, ocrResults, setTranslationEntry])

  return { uploadedDocuments, translationResults, isRunning, startAll, retryOne, skipAll }
}
