import * as Sentry from '@sentry/tanstackstart-react';
import type { CaseDetails } from './types';
import api from '@/integrations/axiosInterceptor';
import { getAPIendpoint } from '@/constants';

export interface ApiError {
  message: string;
  errors?: Record<string, Array<string>>;
}

/**
 * Fetch case details by case ID
 */
export const fetchCaseDetails = async (caseId: string, showErrorNotification = true): Promise<CaseDetails> => {
  return Sentry.startSpan({ name: 'Fetching case details' }, async () => {
    const response = await api.get<CaseDetails>(
      getAPIendpoint(`/entity/case/${caseId}`),
      { showErrorNotification } as any
    );
    return response.data;
  });
};

/**
 * Fetch presigned URL for a document
 */
export const fetchDocumentUrl = async (
  filePath: string,
  view: boolean = false,
  showErrorNotification = true
): Promise<string> => {
  return Sentry.startSpan({ name: `Fetching document ${view ? 'view' : 'download'} URL` }, async () => {
    const response = await api.get<{ url: string }>(
      getAPIendpoint(`/document/download/${filePath}?view=${view}`),
      { showErrorNotification } as any
    );
    return response.data.url;
  });
};
