import { z } from 'zod'

// --- Request schema (mirrors cross_document_validation/schemas/case.py CaseCreateRequest) ---
// Documents sit flat on the object (no extracted_fields/source_file_ref wrapper),
// matching the field-mapping service's own per-document output shape.

export const bankTransactionInSchema = z.object({
  transaction_date: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  amount: z.union([z.number(), z.string()]).nullable().optional(),
  currency: z.string().nullable().optional(),
  direction: z.string().nullable().optional(),
  balance: z.union([z.number(), z.string()]).nullable().optional(),
})

export const documentMetadataPeriodInSchema = z.object({
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
})

export const salarySlipDocumentMetadataInSchema = z.object({
  document_date: z.string().nullable().optional(),
  period: documentMetadataPeriodInSchema.nullable().optional(),
  currency: z.string().nullable().optional(),
})

export const employerInSchema = z.object({
  name: z.string().nullable().optional(),
})

export const employeeInSchema = z
  .object({
    employee_id: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    bank_account_number: z.string().nullable().optional(),
    date_of_joining: z.string().nullable().optional(),
    days_worked: z.number().nullable().optional(),
  })
  .catchall(z.unknown())

export const earningsInSchema = z
  .object({
    basic_per_month: z.union([z.number(), z.string()]).nullable().optional(),
    gross_per_month: z.union([z.number(), z.string()]).nullable().optional(),
    allowances_per_month: z.union([z.number(), z.string()]).nullable().optional(),
    other: z.union([z.number(), z.string()]).nullable().optional(),
  })
  .catchall(z.unknown())

export const deductionsInSchema = z
  .object({
    total: z.union([z.number(), z.string()]).nullable().optional(),
    tax: z.union([z.number(), z.string()]).nullable().optional(),
    retirement_contribution: z.union([z.number(), z.string()]).nullable().optional(),
    other: z.union([z.number(), z.string()]).nullable().optional(),
  })
  .catchall(z.unknown())

export const netSalaryInSchema = z.object({
  amount: z.union([z.number(), z.string()]).nullable().optional(),
  currency: z.string().nullable().optional(),
  amount_in_words: z.string().nullable().optional(),
})

export const aadhaarDocumentInSchema = z.object({
  document_type: z.literal('aadhaar'),
  name: z.string().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  aadhaar_number: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
})

export const panDocumentInSchema = z.object({
  document_type: z.literal('pan'),
  name: z.string().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  pan_number: z.string().nullable().optional(),
})

export const addressProofDocumentInSchema = z.object({
  document_type: z.literal('address_proof'),
  address: z.string().nullable().optional(),
})

export const salarySlipDocumentInSchema = z.object({
  document_type: z.literal('salary_slip'),
  document_metadata: salarySlipDocumentMetadataInSchema.nullable().optional(),
  employer: employerInSchema.nullable().optional(),
  employee: employeeInSchema.nullable().optional(),
  earnings: earningsInSchema.nullable().optional(),
  deductions: deductionsInSchema.nullable().optional(),
  net_salary: netSalaryInSchema.nullable().optional(),
})

export const bankStatementDocumentMetadataInSchema = z.object({
  statement_period: documentMetadataPeriodInSchema.nullable().optional(),
  currency: z.string().nullable().optional(),
})

export const bankAccountInSchema = z.object({
  account_number: z.string().nullable().optional(),
  customer_id: z.string().nullable().optional(),
  account_holder_name: z.string().nullable().optional(),
  account_type: z.string().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  branch_name: z.string().nullable().optional(),
  lien_amount: z.union([z.number(), z.string()]).nullable().optional(),
})

export const bankStatementSummaryInSchema = z.object({
  total_credits: z.union([z.number(), z.string()]).nullable().optional(),
  total_debits: z.union([z.number(), z.string()]).nullable().optional(),
  opening_balance: z.union([z.number(), z.string()]).nullable().optional(),
  closing_balance: z.union([z.number(), z.string()]).nullable().optional(),
})

export const bankStatementDocumentInSchema = z.object({
  document_type: z.literal('bank_statement'),
  document_metadata: bankStatementDocumentMetadataInSchema.nullable().optional(),
  account: bankAccountInSchema.nullable().optional(),
  transactions: z.array(bankTransactionInSchema).default([]),
  summary: bankStatementSummaryInSchema.nullable().optional(),
})

export const documentInSchema = z.discriminatedUnion('document_type', [
  aadhaarDocumentInSchema,
  panDocumentInSchema,
  addressProofDocumentInSchema,
  salarySlipDocumentInSchema,
  bankStatementDocumentInSchema,
])

export const caseCreateRequestSchema = z.object({
  documents: z.array(documentInSchema),
})

export type BankTransactionIn = z.infer<typeof bankTransactionInSchema>
export type AadhaarDocumentIn = z.infer<typeof aadhaarDocumentInSchema>
export type PanDocumentIn = z.infer<typeof panDocumentInSchema>
export type AddressProofDocumentIn = z.infer<typeof addressProofDocumentInSchema>
export type SalarySlipDocumentIn = z.infer<typeof salarySlipDocumentInSchema>
export type BankStatementDocumentIn = z.infer<typeof bankStatementDocumentInSchema>
export type DocumentIn = z.infer<typeof documentInSchema>
export type CaseCreateRequest = z.infer<typeof caseCreateRequestSchema>

// --- Response schema (mirrors CaseCreateResponse) ---

export const validationResultOutSchema = z.object({
  check_type: z.string(),
  passed: z.boolean(),
  score: z.number(),
  document_id: z.string().nullable().optional(),
  // evidence is dynamic/open-ended — shape varies by check_type.
  evidence: z.record(z.string(), z.unknown()).nullable().optional(),
  // Only set for SALARY_DATE checks that matched a bank credit: the salary
  // amount as validated against the bank statement.
  matched_salary_amount: z.number().nullable().optional(),
})

export const caseCreateResponseSchema = z.object({
  case_id: z.string(),
  applicant_ref: z.string(),
  decision: z.string(),
  overall_score: z.number(),
  reasons: z.array(z.string()),
  validation_results: z.array(validationResultOutSchema),
})

export type ValidationResultOut = z.infer<typeof validationResultOutSchema>
export type CaseCreateResponse = z.infer<typeof caseCreateResponseSchema>
