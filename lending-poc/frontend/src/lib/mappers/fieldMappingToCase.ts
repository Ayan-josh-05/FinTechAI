import type { CaseCreateRequest, DocumentIn } from '@/schemas/validation.schema'
import type { DocType, FieldMappingEntry, UploadedDocument } from '@/store/useAppStore'

/**
 * Generates a client-side applicant reference in the APP-YYYY-NNNNN format
 * (matching the example APP-2026-09194). This is a placeholder — nothing in
 * the workflow currently collects a real applicant identifier. Replace this
 * with a real intake field / applicant identifier once available.
 */
export function generateApplicantRef(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0')
  return `APP-${year}-${random}`
}

// Loose helpers for reading possibly-missing/unknown-shaped nested values
// out of the field-mapping result. The real response contract is not yet
// confirmed, so every read here is defensive (optional chaining, safe
// fallbacks) and must never throw on missing/unexpected fields.
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asNumberOrString(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') return value
  return undefined
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/**
 * Maps the (currently unconfirmed) per-document field-mapping API results
 * into the CaseCreateRequest shape expected by POST /cases. Field mapping
 * runs once per document (see useFieldMapping), so this reads each
 * document's own successful result — keyed by document id, dispatched by
 * docType — rather than one combined blob.
 *
 * NOTE: Because the field-mapping backend contract has not been finalized,
 * this function's field-picking logic is necessarily best-effort. It reads
 * data defensively and will need adjustment once the real response shape
 * is confirmed.
 */
export function mapFieldMappingResultToCaseRequest(
  uploadedDocuments: UploadedDocument[],
  fieldMappingResults: Record<string, FieldMappingEntry>,
  applicantRef: string
): CaseCreateRequest {
  const resultFor = (docType: DocType): Record<string, unknown> => {
    const doc = uploadedDocuments.find((d) => d.docType === docType)
    if (!doc) return {}
    const entry = fieldMappingResults[doc.id]
    if (!entry || entry.status !== 'success') return {}
    return asRecord(entry.data)
  }

  const documents: DocumentIn[] = []

  const aadhaar = resultFor('AADHAAR')
  if (Object.keys(aadhaar).length > 0) {
    documents.push({
      doc_type: 'AADHAAR',
      extracted_fields: {
        name: asString(aadhaar.name),
        address: asString(aadhaar.address),
        aadhaar_number: asString(aadhaar.aadhaar_number),
        date_of_birth: asString(aadhaar.date_of_birth),
      },
      source_file_ref: asString(aadhaar.source_file_ref),
    })
  }

  const pan = resultFor('PAN')
  if (Object.keys(pan).length > 0) {
    documents.push({
      doc_type: 'PAN',
      extracted_fields: {
        name: asString(pan.name),
        pan_number: asString(pan.pan_number),
      },
      source_file_ref: asString(pan.source_file_ref),
    })
  }

  const salarySlip = resultFor('SALARY_SLIP')
  if (Object.keys(salarySlip).length > 0) {
    const employer = asRecord(salarySlip.employer)
    const employee = asRecord(salarySlip.employee)
    const netSalary = asRecord(salarySlip.net_salary)
    const documentMetadata = asRecord(salarySlip.document_metadata)
    const period = asRecord(documentMetadata.period)

    documents.push({
      doc_type: 'SALARY_SLIP',
      salary_slips: [
        {
          extracted_fields: {
            name: asString(employee.name),
            employer_name: asString(employer.name),
            net_salary: asNumberOrString(netSalary.amount),
            salary_month: asString(period.from) ?? asString(documentMetadata.document_date),
          },
          source_file_ref: asString(salarySlip.source_file_ref),
        },
      ],
      source_file_ref: asString(salarySlip.source_file_ref),
    })
  }

  const bankStatement = resultFor('BANK_STATEMENT')
  if (Object.keys(bankStatement).length > 0) {
    const account = asRecord(bankStatement.account)
    const transactions = asArray(bankStatement.transactions).map((txn) => {
      const t = asRecord(txn)
      return {
        narration: asString(t.description) ?? asString(t.narration),
        amount: typeof t.amount === 'number' ? t.amount : undefined,
        date: asString(t.transaction_date) ?? asString(t.date),
      }
    })

    documents.push({
      doc_type: 'BANK_STATEMENT',
      extracted_fields: {
        name: asString(account.account_holder_name),
        transactions,
      },
      source_file_ref: asString(bankStatement.source_file_ref),
    })
  }

  return {
    applicant_ref: applicantRef,
    documents,
  }
}
