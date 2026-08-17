import { ValidationRow } from './ValidationRow'
import type { ValidationResultOut } from '@/schemas/validation.schema'

interface ValidationTableProps {
  results: ValidationResultOut[]
}

export function ValidationTable({ results }: ValidationTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Attribute
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Source Value
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Target Value
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Confidence Score
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            // check_type/document_id are not guaranteed unique across rows,
            // so the index is included to keep the composite key stable.
            <ValidationRow
              key={`${result.check_type}-${result.document_id ?? ''}-${index}`}
              result={result}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
