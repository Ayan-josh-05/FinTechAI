import { useCallback, useState } from 'react'
import { createCase } from '@/api/cases'
import { useAppStore } from '@/store/useAppStore'
import { toAppError, type AppError } from '@/lib/errors'
import { mapFieldMappingResultToCaseRequest } from '@/lib/mappers/fieldMappingToCase'

export function useValidation() {
  const uploadedDocuments = useAppStore((s) => s.uploadedDocuments)
  const fieldMappingResults = useAppStore((s) => s.fieldMappingResults)
  const validationResult = useAppStore((s) => s.validationResult)
  const setValidationResult = useAppStore((s) => s.setValidationResult)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)

  const submit = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // applicant_ref is generated server-side and returned in the response.
      const payload = mapFieldMappingResultToCaseRequest(uploadedDocuments, fieldMappingResults)
      const result = await createCase(payload)
      setValidationResult(result)
    } catch (err) {
      setError(toAppError(err))
    } finally {
      setIsLoading(false)
    }
  }, [uploadedDocuments, fieldMappingResults, setValidationResult])

  const retry = useCallback(() => {
    void submit()
  }, [submit])

  return { validationResult, isLoading, error, submit, retry }
}
