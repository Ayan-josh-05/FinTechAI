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
    <nav aria-label="Workflow progress" className="w-full overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center">
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
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 sm:text-sm',
                  isCurrent && 'border-brand-600 bg-brand-600 text-white shadow-sm',
                  !isCurrent &&
                    isCompleted &&
                    'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                  !isCurrent &&
                    !isCompleted &&
                    !isDisabled &&
                    'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                  isDisabled && 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                    isCurrent && 'bg-white text-brand-600',
                    !isCurrent && isCompleted && 'bg-emerald-500 text-white',
                    !isCurrent && !isCompleted && !isDisabled && 'bg-slate-200 text-slate-600',
                    isDisabled && 'bg-slate-100 text-slate-300'
                  )}
                  aria-hidden="true"
                >
                  {isCompleted ? '✓' : index + 1}
                </span>
                {STEP_LABELS[step]}
              </button>
              {index < WORKFLOW_STEPS.length - 1 && (
                <span
                  className={cn(
                    'mx-1.5 h-px w-4 shrink-0 transition-colors duration-150 sm:w-8',
                    index < currentIndex ? 'bg-emerald-300' : 'bg-slate-200'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
