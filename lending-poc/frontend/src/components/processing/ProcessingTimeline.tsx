const STAGES = ['Uploaded', 'Processing', 'Completed']

interface ProcessingTimelineProps {
  /** Index of the furthest stage reached across all documents (0-2). */
  activeStageIndex: number
}

/**
 * Simple indeterminate stage indicator — no fake percentages, just the
 * discrete stage the batch is currently in.
 */
export function ProcessingTimeline({ activeStageIndex }: ProcessingTimelineProps) {
  return (
    <ol className="flex items-center gap-4">
      {STAGES.map((stage, index) => (
        <li key={stage} className="flex items-center gap-2 text-sm">
          <span
            className={
              index <= activeStageIndex
                ? 'flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white'
                : 'flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-500'
            }
            aria-hidden="true"
          >
            {index < activeStageIndex ? '✓' : index + 1}
          </span>
          <span
            className={index <= activeStageIndex ? 'font-medium text-slate-900' : 'text-slate-400'}
          >
            {stage}
          </span>
        </li>
      ))}
    </ol>
  )
}
