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
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white shadow-sm">
              L
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                KYC Document Verification &amp; Data Validation
              </h1>
              <p className="text-xs text-slate-500">Lending onboarding workflow</p>
            </div>
          </div>
          <div className="mt-5">
            <WorkflowStepper currentStep={currentStep} maxReachedIndex={maxReachedIndex} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="animate-fade-in">{children}</div>
      </main>
    </div>
  )
}
