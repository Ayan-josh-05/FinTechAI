import type { CaseCreateRequest, DocumentIn } from '@/schemas/validation.schema'
import type { DocType, FieldMappingEntry, UploadedDocument } from '@/store/useAppStore'

const DOCUMENT_TYPE_BY_DOC_TYPE: Record<DocType, DocumentIn['document_type']> = {
  AADHAAR: 'aadhaar',
  PAN: 'pan',
  SALARY_SLIP: 'salary_slip',
  BANK_STATEMENT: 'bank_statement',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

/**
 * Builds the CaseCreateRequest expected by POST /cases from each document's
 * own field-mapping result. Field mapping runs once per document (see
 * useFieldMapping) and its response shape already matches a /cases document
 * directly (document_metadata, employer, employee, earnings, deductions,
 * net_salary, account, transactions, summary, ...) — so each result is
 * passed through as-is, with document_type attached/overridden to match the
 * discriminated union.
 */
export function mapFieldMappingResultToCaseRequest(
  uploadedDocuments: UploadedDocument[],
  fieldMappingResults: Record<string, FieldMappingEntry>
): CaseCreateRequest {
  const documents: DocumentIn[] = []

  for (const doc of uploadedDocuments) {
    const entry = fieldMappingResults[doc.id]
    if (!entry || entry.status !== 'success') continue

    const data = asRecord(entry.data)
    documents.push({
      ...data,
      document_type: DOCUMENT_TYPE_BY_DOC_TYPE[doc.docType],
    } as DocumentIn)
  }

  return { documents }
}
