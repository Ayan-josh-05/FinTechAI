import { useState } from 'react'
import { StatusBadge } from '@/components/common/StatusBadge'
import { JsonViewer } from '@/components/common/JsonViewer'
import type { ValidationResultOut } from '@/schemas/validation.schema'

interface ValidationRowProps {
  result: ValidationResultOut
}

function readEvidenceField(
  evidence: Record<string, unknown> | null | undefined,
  key: string
): string {
  const value = evidence?.[key]
  if (value === undefined || value === null) return '—'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return JSON.stringify(value)
}

export function ValidationRow({ result }: ValidationRowProps) {
  const [expanded, setExpanded] = useState(false)
  const evidence = result.evidence ?? null

  return (
    <>
      <tr className="transition-colors hover:bg-slate-50">
        <td className="px-4 py-3 text-sm font-medium text-slate-900">{result.check_type}</td>
        <td className="px-4 py-3 text-sm text-slate-700">
          {readEvidenceField(evidence, 'source_text')}
        </td>
        <td className="px-4 py-3 text-sm text-slate-700">
          {readEvidenceField(evidence, 'target_text')}
        </td>
        <td className="px-4 py-3 text-sm text-slate-700">{result.score.toFixed(1)}</td>
        <td className="px-4 py-3">
          <StatusBadge status={result.passed ? 'PASS' : 'FAIL'} />
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline"
          >
            {expanded ? 'Hide details' : 'View details'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={6} className="px-4 py-4">
            <div className="mb-2 flex flex-wrap gap-4 text-xs text-slate-600">
              <span>
                <span className="font-medium text-slate-800">Document:</span>{' '}
                {result.document_id ?? '—'}
              </span>
            </div>
            <JsonViewer data={evidence ?? {}} />
          </td>
        </tr>
      )}
    </>
  )
}
