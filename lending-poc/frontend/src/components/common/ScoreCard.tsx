import { StatusBadge } from './StatusBadge'

interface ScoreCardProps {
  decision: string
  overallScore: number
  caseId: string
  applicantRef: string
  reasons: string[]
}

/**
 * Prominent summary card for the validation decision/score.
 */
export function ScoreCard({
  decision,
  overallScore,
  caseId,
  applicantRef,
  reasons,
}: ScoreCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-6 bg-gradient-to-br from-slate-50 to-white p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decision</p>
          <div className="mt-2">
            <StatusBadge status={decision} className="px-3 py-1.5 text-sm" />
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Overall Score
          </p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
            {overallScore.toFixed(1)}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 border-t border-slate-100 p-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Case ID</dt>
          <dd className="mt-1 break-all font-mono text-sm text-slate-700">{caseId}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Applicant Reference
          </dt>
          <dd className="mt-1 font-mono text-sm text-slate-700">{applicantRef}</dd>
        </div>
      </dl>

      {reasons.length > 0 && (
        <div className="border-t border-slate-100 p-6 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Reasons</p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-slate-700">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
