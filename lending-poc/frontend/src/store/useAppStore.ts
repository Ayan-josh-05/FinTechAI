import { create } from 'zustand'
import type { ExtractResponse } from '@/schemas/extract.schema'
import type { TranslationResult } from '@/schemas/translation.schema'
import type { FieldMappingResult } from '@/schemas/fieldMapping.schema'
import type { CaseCreateResponse } from '@/schemas/validation.schema'
import type { AppError } from '@/lib/errors'

export type DocType = 'AADHAAR' | 'PAN' | 'SALARY_SLIP' | 'BANK_STATEMENT'

export type WorkflowStep =
  'upload' | 'processing' | 'ocr' | 'translation' | 'field-mapping' | 'validation'

export const WORKFLOW_STEPS: WorkflowStep[] = [
  'upload',
  'processing',
  'ocr',
  'translation',
  'field-mapping',
  'validation',
]

export interface UploadedDocument {
  id: string
  docType: DocType
  file: File
  fileName: string
  fileSize: number
  fileType: string
}

/** Per-document OCR outcome, keyed by document id (not array position). */
export type OcrEntry =
  | { status: 'pending' }
  | { status: 'processing' }
  | { status: 'success'; data: ExtractResponse }
  | { status: 'error'; error: AppError }

/** Per-document translation outcome, keyed by document id. */
export type TranslationEntry =
  | { status: 'pending' }
  | { status: 'processing' }
  | { status: 'success'; data: TranslationResult }
  | { status: 'error'; error: AppError }

/** Per-document field-mapping outcome, keyed by document id. */
export type FieldMappingEntry =
  | { status: 'pending' }
  | { status: 'processing' }
  | { status: 'success'; data: FieldMappingResult }
  | { status: 'error'; error: AppError }

interface AppState {
  isLoading: boolean
  setLoading: (v: boolean) => void

  currentStep: WorkflowStep
  setCurrentStep: (step: WorkflowStep) => void

  uploadedDocuments: UploadedDocument[]
  setUploadedDocuments: (docs: UploadedDocument[]) => void

  ocrResults: Record<string, OcrEntry>
  setOcrEntry: (documentId: string, entry: OcrEntry) => void
  setOcrResults: (results: Record<string, OcrEntry>) => void

  translationResults: Record<string, TranslationEntry>
  setTranslationEntry: (documentId: string, entry: TranslationEntry) => void
  setTranslationResults: (results: Record<string, TranslationEntry>) => void

  fieldMappingResults: Record<string, FieldMappingEntry>
  setFieldMappingEntry: (documentId: string, entry: FieldMappingEntry) => void
  setFieldMappingResults: (results: Record<string, FieldMappingEntry>) => void

  caseId: string | null
  applicantRef: string | null
  validationResult: CaseCreateResponse | null
  setValidationResult: (result: CaseCreateResponse | null, applicantRef?: string | null) => void

  resetWorkflow: () => void
}

const initialWorkflowState = {
  currentStep: 'upload' as WorkflowStep,
  uploadedDocuments: [] as UploadedDocument[],
  ocrResults: {} as Record<string, OcrEntry>,
  translationResults: {} as Record<string, TranslationEntry>,
  fieldMappingResults: {} as Record<string, FieldMappingEntry>,
  caseId: null as string | null,
  applicantRef: null as string | null,
  validationResult: null as CaseCreateResponse | null,
}

export const useAppStore = create<AppState>((set) => ({
  isLoading: false,
  setLoading: (v) => set({ isLoading: v }),

  ...initialWorkflowState,

  setCurrentStep: (step) => set({ currentStep: step }),

  setUploadedDocuments: (docs) => set({ uploadedDocuments: docs }),

  setOcrEntry: (documentId, entry) =>
    set((state) => ({
      ocrResults: { ...state.ocrResults, [documentId]: entry },
    })),
  setOcrResults: (results) => set({ ocrResults: results }),

  setTranslationEntry: (documentId, entry) =>
    set((state) => ({
      translationResults: { ...state.translationResults, [documentId]: entry },
    })),
  setTranslationResults: (results) => set({ translationResults: results }),

  setFieldMappingEntry: (documentId, entry) =>
    set((state) => ({
      fieldMappingResults: { ...state.fieldMappingResults, [documentId]: entry },
    })),
  setFieldMappingResults: (results) => set({ fieldMappingResults: results }),

  setValidationResult: (result, applicantRef) =>
    set({
      validationResult: result,
      caseId: result?.case_id ?? null,
      applicantRef: applicantRef ?? result?.applicant_ref ?? null,
    }),

  resetWorkflow: () => set({ ...initialWorkflowState }),
}))
