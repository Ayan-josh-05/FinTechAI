import { useCallback, useState } from 'react'
import { extractDocuments } from '@/api/extract'
import { useAppStore, type UploadedDocument } from '@/store/useAppStore'
import { toAppError } from '@/lib/errors'

/**
 * Drives OCR extraction for the uploaded documents. Populates per-document
 * entries in the store (ocrResults keyed by document id) so a single
 * failure never hides the others. Exposes a retry for a single document.
 */
export function useOCR() {
  const uploadedDocuments = useAppStore((s) => s.uploadedDocuments)
  const ocrResults = useAppStore((s) => s.ocrResults)
  const setOcrEntry = useAppStore((s) => s.setOcrEntry)
  const [isRunning, setIsRunning] = useState(false)

  const runExtraction = useCallback(
    async (docs: UploadedDocument[]) => {
      if (docs.length === 0) return
      setIsRunning(true)
      docs.forEach((doc) => setOcrEntry(doc.id, { status: 'processing' }))

      const results = await extractDocuments(docs.map((d) => d.file))

      results.forEach((result, index) => {
        const doc = docs[index]
        if (result.status === 'fulfilled') {
          setOcrEntry(doc.id, { status: 'success', data: result.data })
        } else {
          setOcrEntry(doc.id, { status: 'error', error: result.error })
        }
      })
      setIsRunning(false)
    },
    [setOcrEntry]
  )

  const startAll = useCallback(() => {
    void runExtraction(uploadedDocuments)
  }, [runExtraction, uploadedDocuments])

  const retryOne = useCallback(
    async (documentId: string) => {
      const doc = uploadedDocuments.find((d) => d.id === documentId)
      if (!doc) return
      setOcrEntry(doc.id, { status: 'processing' })
      try {
        const results = await extractDocuments([doc.file])
        const result = results[0]
        if (result.status === 'fulfilled') {
          setOcrEntry(doc.id, { status: 'success', data: result.data })
        } else {
          setOcrEntry(doc.id, { status: 'error', error: result.error })
        }
      } catch (error) {
        setOcrEntry(doc.id, { status: 'error', error: toAppError(error) })
      }
    },
    [uploadedDocuments, setOcrEntry]
  )

  return { uploadedDocuments, ocrResults, isRunning, startAll, retryOne }
}
