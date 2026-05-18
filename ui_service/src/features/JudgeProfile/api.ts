import * as Sentry from '@sentry/tanstackstart-react';
import type { JudgeData } from './types';
import api from '@/integrations/axiosInterceptor';
import { getAPIendpoint } from '@/constants';

export interface ApiError {
  message: string;
  errors?: Record<string, Array<string>>;
}

/**
 * Fetch judge details by judge ID
 */
export const fetchJudgeDetails = async (judgeId: string, showErrorNotification = true): Promise<JudgeData> => {
  return Sentry.startSpan({ name: 'Fetching judge details' }, async () => {
    const response = await api.get<JudgeData>(
      getAPIendpoint(`/entity/judge/${judgeId}`),
      { showErrorNotification } as any
    );
    return response.data;
  });
};
