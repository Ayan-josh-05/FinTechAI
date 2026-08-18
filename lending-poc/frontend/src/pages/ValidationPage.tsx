import { useEffect, useRef } from 'react'
import { useValidation } from '@/hooks/useValidation'
import { useAppStore } from '@/store/useAppStore'
import { RequireStep } from '@/components/layout/RequireStep'
import { ScoreCard } from '@/components/common/ScoreCard'
import { ValidationTable } from '@/components/validation/ValidationTable'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/common/Button'

function ValidationPageContent() {
  const setCurrentStep = useAppStore((s) => s.setCurrentStep)
  const { validationResult, isLoading, error, submit, retry } = useValidation()
  // Guards against React StrictMode's dev-only double-invoke of mount
  // effects, which would otherwise double-submit the case (see the same
  // fix in ProcessingPage/TranslationPage for the full explanation).
  const hasStartedRef = useRef(false)

  useEffect(() => {
    setCurrentStep('validation')
    if (!validationResult && !hasStartedRef.current) {
      hasStartedRef.current = true
      void submit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Data Validation</h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Cross-document validation results for this case.
        </p>
      </div>

      {isLoading && <LoadingState message="Submitting case for validation…" />}

      {!isLoading && error && <ErrorState message={error.message} onRetry={retry} />}

      {!isLoading && !error && !validationResult && (
        <EmptyState
          title="No validation results yet"
          message="Submit the case to run cross-document validation."
          action={
            <Button type="button" onClick={() => void submit()}>
              Run Validation
            </Button>
          }
        />
      )}

      {!isLoading && validationResult && (
        <div className="space-y-6">
          <ScoreCard
            decision={validationResult.decision}
            overallScore={validationResult.overall_score}
            caseId={validationResult.case_id}
            applicantRef={validationResult.applicant_ref}
            reasons={validationResult.reasons}
          />
          {validationResult.validation_results.length > 0 ? (
            <ValidationTable results={validationResult.validation_results} />
          ) : (
            <EmptyState title="No validation checks returned" />
          )}
        </div>
      )}
    </div>
  )
}

export default function ValidationPage() {
  return (
    <RequireStep step="validation">
      <ValidationPageContent />
    </RequireStep>
  )
}
