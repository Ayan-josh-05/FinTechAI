import * as Sentry from '@sentry/tanstackstart-react';
import type { LawyerData } from './types';
import api from '@/integrations/axiosInterceptor';
import { getAPIendpoint } from '@/constants';

export interface ApiError {
  message: string;
  errors?: Record<string, Array<string>>;
}

/**
 * Fetch lawyer details by lawyer ID
 */
export const fetchLawyerDetails = async (lawyerId: string, showErrorNotification = true): Promise<LawyerData> => {
  return Sentry.startSpan({ name: 'Fetching lawyer details' }, async () => {
    const response = await api.get<LawyerData>(
      getAPIendpoint(`/entity/lawyer/${lawyerId}`),
      { showErrorNotification } as any
    );
    return response.data;
  });
};
