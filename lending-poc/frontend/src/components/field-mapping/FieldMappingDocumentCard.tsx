import { JsonViewer } from '@/components/common/JsonViewer'
import { StatusBadge, type Status } from '@/components/common/StatusBadge'
import { Spinner } from '@/components/common/Spinner'
import { Button } from '@/components/common/Button'
import { docTypeLabel } from '@/lib/documentTypes'
import { getFieldMappingTemplateFor } from '@/lib/fieldMappingTemplate'
import type { DocType, FieldMappingEntry } from '@/store/useAppStore'

interface FieldMappingDocumentCardProps {
  docType: DocType
  entry: FieldMappingEntry | undefined
  onGenerate: () => void
}

function toStatus(entry: FieldMappingEntry | undefined): Status {
  if (!entry) return 'PENDING'
  if (entry.status === 'processing') return 'PROCESSING'
  if (entry.status === 'success') return 'COMPLETED'
  if (entry.status === 'error') return 'FAILED'
  return 'PENDING'
}

const NOT_CONFIGURED_HINT = 'not yet configured'

/**
 * One card per document, always in this order: template (request payload)
 * -> a Generate/Retry action for this document alone -> result once
 * available. Field mapping is called once per document, so template and
 * result are always shown per-document, never combined across all 4.
 */
export function FieldMappingDocumentCard({
  docType,
  entry,
  onGenerate,
}: FieldMappingDocumentCardProps) {
  const status = toStatus(entry)
  const template = getFieldMappingTemplateFor(docType)
  const isNotConfigured =
    entry?.status === 'error' && entry.error.message.toLowerCase().includes(NOT_CONFIGURED_HINT)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-800">{docTypeLabel(docType)}</h3>
        <div className="flex items-center gap-2">
          {status === 'PROCESSING' && <Spinner />}
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Template (request payload)
        </p>
        <JsonViewer data={template} />
      </div>

      <div className="mb-4 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onGenerate}
          disabled={status === 'PROCESSING'}
        >
          {status === 'PENDING' && 'Generate'}
          {status === 'PROCESSING' && 'Generating…'}
          {status === 'FAILED' && 'Retry'}
          {status === 'COMPLETED' && 'Regenerate'}
        </Button>
      </div>

      {status === 'FAILED' && entry?.status === 'error' && (
        <div
          className={
            isNotConfigured
              ? 'rounded-lg border border-amber-200 bg-amber-50 p-3'
              : 'rounded-lg border border-red-200 bg-red-50 p-3'
          }
        >
          <p className={isNotConfigured ? 'text-xs text-amber-800' : 'text-xs text-red-800'}>
            {isNotConfigured
              ? 'Field Mapping API is not yet available. The template above is exactly what will be sent for this document once the backend is ready.'
              : entry.error.message}
          </p>
        </div>
      )}

      {status === 'COMPLETED' && entry?.status === 'success' && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Result
          </p>
          <JsonViewer data={entry.data} />
        </div>
      )}
    </div>
  )
}
