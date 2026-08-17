import type { ReactNode } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { getMaxReachedIndex } from '@/lib/workflowProgress'
import { WorkflowStepper } from './WorkflowStepper'

interface AppShellProps {
  children: ReactNode
}

/**
 * Persistent shell for the 6-page workflow: top bar + horizontal stepper,
 * visible on every workflow page.
 */
export function AppShell({ children }: AppShellProps) {
  const currentStep = useAppStore((s) => s.currentStep)
  const maxReachedIndex = useAppStore(getMaxReachedIndex)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <h1 className="text-lg font-semibold text-gray-900">
            KYC Document Verification &amp; Data Validation
          </h1>
          <div className="mt-4">
            <WorkflowStepper currentStep={currentStep} maxReachedIndex={maxReachedIndex} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
