import type { FieldMappingTemplate, FieldMappingTemplateEntry } from '@/schemas/fieldMapping.schema'
import type { DocType } from '@/store/useAppStore'

/**
 * Static field-mapping template. Always the same for every case; shown to
 * the user via JsonViewer and will eventually be part of the field-mapping
 * request payload once the backend contract is confirmed.
 */
export const FIELD_MAPPING_TEMPLATE: FieldMappingTemplate = [
  {
    document_type: 'salary_slip',
    document_metadata: {
      document_date: '',
      period: { from: 'Mandatory', to: 'Mandatory' },
      currency: '',
    },
    employer: { name: 'Mandatory' },
    employee: {
      employee_id: '',
      name: 'Mandatory',
      bank_account_number: 'Mandatory',
      date_of_joining: 'May be imp',
      days_worked: 'May be imp',
    },
    earnings: {
      basic_per_month: null,
      gross_per_month: null,
      allowances_per_month: null,
      other: null,
    },
    deductions: {
      total: null,
      tax: null,
      retirement_contribution: null,
      other: null,
    },
    net_salary: { amount: 'Mandatory', currency: 'Mandatory', amount_in_words: '' },
  },
  {
    document_type: 'bank_statement',
    document_metadata: {
      statement_period: { from: '', to: '' },
      currency: '',
    },
    account: {
      account_number: '',
      customer_id: '',
      account_holder_name: '',
      account_type: '',
      bank_name: '',
      branch_name: '',
      lien_amount: null,
    },
    transactions: [
      {
        transaction_date: '',
        description: 'Josh Software',
        amount: null,
        currency: '',
        direction: 'Credited/Debited',
        balance: null,
      },
    ],
    summary: {
      total_credits: null,
      total_debits: null,
      opening_balance: null,
      closing_balance: null,
    },
  },
  {
    document_type: 'aadhaar',
    name: 'Mandatory',
    date_of_birth: 'Mandatory',
    aadhaar_number: 'Mandatory',
    address: 'Mandatory',
  },
  {
    document_type: 'pan',
    name: 'Mandatory',
    date_of_birth: 'Mandatory',
    pan_number: 'Mandatory',
  },
]

/** Maps our internal DocType to the template's document_type key. */
const DOC_TYPE_TO_TEMPLATE_KEY: Record<DocType, FieldMappingTemplateEntry['document_type']> = {
  AADHAAR: 'aadhaar',
  PAN: 'pan',
  SALARY_SLIP: 'salary_slip',
  BANK_STATEMENT: 'bank_statement',
}

/**
 * Field Mapping is called once per document, so each document only needs its
 * own template entry — not the full 4-entry array.
 */
export function getFieldMappingTemplateFor(docType: DocType): FieldMappingTemplateEntry {
  const key = DOC_TYPE_TO_TEMPLATE_KEY[docType]
  const entry = FIELD_MAPPING_TEMPLATE.find((t) => t.document_type === key)
  if (!entry) {
    throw new Error(`No field-mapping template found for document type "${docType}"`)
  }
  return entry
}
