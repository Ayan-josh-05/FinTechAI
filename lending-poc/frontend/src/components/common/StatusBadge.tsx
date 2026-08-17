import { cn } from '@/lib/utils'

export type Status =
  'PASS' | 'FAIL' | 'NEEDS_REVIEW' | 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PENDING'

const STATUS_CONFIG: Record<Status, { label: string; icon: string; className: string }> = {
  PASS: {
    label: 'Pass',
    icon: '✓',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  FAIL: { label: 'Fail', icon: '✕', className: 'bg-red-50 text-red-700 border-red-200' },
  NEEDS_REVIEW: {
    label: 'Needs Review',
    icon: '!',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  UPLOADED: {
    label: 'Uploaded',
    icon: '↑',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  PROCESSING: {
    label: 'Processing',
    icon: '…',
    className: 'bg-brand-50 text-brand-700 border-brand-200',
  },
  COMPLETED: {
    label: 'Completed',
    icon: '✓',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  FAILED: { label: 'Failed', icon: '✕', className: 'bg-red-50 text-red-700 border-red-200' },
  PENDING: {
    label: 'Pending',
    icon: '·',
    className: 'bg-slate-50 text-slate-500 border-slate-200',
  },
}

interface StatusBadgeProps {
  status: Status | string
  className?: string
}

/**
 * Status is always conveyed by text + icon together, never color alone.
 * Falls back gracefully for unrecognized status strings (e.g. open-ended
 * decision values from the backend).
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as Status] ?? {
    label: status,
    icon: '•',
    className: 'bg-slate-50 text-slate-700 border-slate-200',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        config.className,
        className
      )}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  )
}
