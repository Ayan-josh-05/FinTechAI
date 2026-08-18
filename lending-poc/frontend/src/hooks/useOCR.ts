import { useCallback, useState } from 'react'
import { extractOne } from '@/api/extract'
import { useAppStore, type UploadedDocument } from '@/store/useAppStore'
import { toAppError } from '@/lib/errors'

/**
 * Drives OCR extraction for the uploaded documents. Populates per-document
 * entries in the store (ocrResults keyed by document id) as each document's
 * own request settles — independently of how long the others take — so a
 * single failure never hides the others, and finished documents show up
 * immediately instead of waiting for the whole batch. Exposes a retry for a
 * single document.
 */
export function useOCR() {
  const uploadedDocuments = useAppStore((s) => s.uploadedDocuments)
  const ocrResults = useAppStore((s) => s.ocrResults)
  const setOcrEntry = useAppStore((s) => s.setOcrEntry)
  const [isRunning, setIsRunning] = useState(false)

  const extractDoc = useCallback(
    async (doc: UploadedDocument) => {
      try {
        const data = await extractOne(doc.file)
        setOcrEntry(doc.id, { status: 'success', data })
      } catch (error) {
        setOcrEntry(doc.id, { status: 'error', error: toAppError(error) })
      }
    },
    [setOcrEntry]
  )

  const runExtraction = useCallback(
    async (docs: UploadedDocument[]) => {
      if (docs.length === 0) return
      setIsRunning(true)
      docs.forEach((doc) => setOcrEntry(doc.id, { status: 'processing' }))

      // The OCR backend serializes extraction (the underlying Surya engine
      // segfaults if invoked concurrently), so firing all requests at once
      // just piles them up behind a lock until their connections time out.
      // Send them one at a time instead.
      for (const doc of docs) {
        await extractDoc(doc)
      }

      setIsRunning(false)
    },
    [setOcrEntry, extractDoc]
  )

  const startAll = useCallback(() => {
    void runExtraction(uploadedDocuments)
  }, [runExtraction, uploadedDocuments])

  const retryOne = useCallback(
    async (documentId: string) => {
      const doc = uploadedDocuments.find((d) => d.id === documentId)
      if (!doc) return
      setOcrEntry(doc.id, { status: 'processing' })
      await extractDoc(doc)
    },
    [uploadedDocuments, setOcrEntry, extractDoc]
  )

  return { uploadedDocuments, ocrResults, isRunning, startAll, retryOne }
}
