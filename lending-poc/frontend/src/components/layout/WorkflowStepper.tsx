import { useNavigate } from 'react-router-dom'
import { WORKFLOW_STEPS, type WorkflowStep } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

const STEP_LABELS: Record<WorkflowStep, string> = {
  upload: 'Upload',
  processing: 'OCR Processing',
  ocr: 'OCR Result',
  translation: 'Translation',
  'field-mapping': 'Field Mapping',
  validation: 'Validation',
}

const STEP_PATHS: Record<WorkflowStep, string> = {
  upload: '/upload',
  processing: '/processing',
  ocr: '/ocr',
  translation: '/translation',
  'field-mapping': '/field-mapping',
  validation: '/validation',
}

interface WorkflowStepperProps {
  currentStep: WorkflowStep
  /** Furthest step index the user has legitimately reached; steps beyond this are disabled. */
  maxReachedIndex: number
}

export function WorkflowStepper({ currentStep, maxReachedIndex }: WorkflowStepperProps) {
  const navigate = useNavigate()
  const currentIndex = WORKFLOW_STEPS.indexOf(currentStep)

  return (
    <nav aria-label="Workflow progress" className="w-full overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 sm:gap-2">
        {WORKFLOW_STEPS.map((step, index) => {
          const isCurrent = step === currentStep
          const isCompleted = index < currentIndex
          const isDisabled = index > maxReachedIndex

          return (
            <li key={step} className="flex items-center">
              <button
                type="button"
                disabled={isDisabled}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => navigate(STEP_PATHS[step])}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm',
                  isCurrent && 'border-blue-600 bg-blue-600 text-white',
                  !isCurrent &&
                    isCompleted &&
                    'border-green-200 bg-green-50 text-green-800 hover:bg-green-100',
                  !isCurrent &&
                    !isCompleted &&
                    !isDisabled &&
                    'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
                  isDisabled && 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]',
                    isCurrent && 'bg-white text-blue-600',
                    !isCurrent && isCompleted && 'bg-green-600 text-white',
                    !isCurrent && !isCompleted && 'bg-gray-200 text-gray-600'
                  )}
                  aria-hidden="true"
                >
                  {isCompleted ? '✓' : index + 1}
                </span>
                {STEP_LABELS[step]}
              </button>
              {index < WORKFLOW_STEPS.length - 1 && (
                <span className="mx-1 h-px w-4 bg-gray-300 sm:w-6" aria-hidden="true" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
