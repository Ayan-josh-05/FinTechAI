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
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Decision</p>
          <div className="mt-1">
            <StatusBadge status={decision} className="px-3 py-1 text-sm" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Overall Score</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{overallScore.toFixed(1)}</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Case ID</dt>
          <dd className="mt-1 break-all font-mono text-sm text-gray-800">{caseId}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Applicant Reference
          </dt>
          <dd className="mt-1 font-mono text-sm text-gray-800">{applicantRef}</dd>
        </div>
      </dl>

      {reasons.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Reasons</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
