import { useCallback, useState } from 'react'
import { createCase } from '@/api/cases'
import { useAppStore } from '@/store/useAppStore'
import { toAppError, type AppError } from '@/lib/errors'
import {
  generateApplicantRef,
  mapFieldMappingResultToCaseRequest,
} from '@/lib/mappers/fieldMappingToCase'

export function useValidation() {
  const uploadedDocuments = useAppStore((s) => s.uploadedDocuments)
  const fieldMappingResults = useAppStore((s) => s.fieldMappingResults)
  const validationResult = useAppStore((s) => s.validationResult)
  const setValidationResult = useAppStore((s) => s.setValidationResult)
  const applicantRef = useAppStore((s) => s.applicantRef)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)

  const submit = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // applicant_ref is generated client-side for now — replace with a
      // real applicant identifier / intake field once one is collected.
      const ref = applicantRef ?? generateApplicantRef()
      const payload = mapFieldMappingResultToCaseRequest(
        uploadedDocuments,
        fieldMappingResults,
        ref
      )
      const result = await createCase(payload)
      setValidationResult(result, ref)
    } catch (err) {
      setError(toAppError(err))
    } finally {
      setIsLoading(false)
    }
  }, [uploadedDocuments, fieldMappingResults, applicantRef, setValidationResult])

  const retry = useCallback(() => {
    void submit()
  }, [submit])

  return { validationResult, isLoading, error, submit, retry }
}
