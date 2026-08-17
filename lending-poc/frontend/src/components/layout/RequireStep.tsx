import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore, WORKFLOW_STEPS, type WorkflowStep } from '@/store/useAppStore'
import { getMaxReachedIndex } from '@/lib/workflowProgress'

const STEP_PATHS: Record<WorkflowStep, string> = {
  upload: '/upload',
  processing: '/processing',
  ocr: '/ocr',
  translation: '/translation',
  'field-mapping': '/field-mapping',
  validation: '/validation',
}

interface RequireStepProps {
  step: WorkflowStep
  children: ReactNode
}

/**
 * Guards a workflow page: if the user's current state doesn't allow them to
 * reach this step yet (e.g. no OCR results but trying to view /translation),
 * redirect back to the furthest step they've legitimately reached.
 */
export function RequireStep({ step, children }: RequireStepProps) {
  const navigate = useNavigate()
  const maxReachedIndex = useAppStore(getMaxReachedIndex)
  const targetIndex = WORKFLOW_STEPS.indexOf(step)
  const isAllowed = targetIndex <= maxReachedIndex

  useEffect(() => {
    if (!isAllowed) {
      navigate(STEP_PATHS[WORKFLOW_STEPS[maxReachedIndex]], { replace: true })
    }
  }, [isAllowed, maxReachedIndex, navigate])

  if (!isAllowed) return null

  return <>{children}</>
}
