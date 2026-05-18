import * as Sentry from '@sentry/tanstackstart-react';
import type { CourtDetailsData } from './types';
import api from '@/integrations/axiosInterceptor';
import { getAPIendpoint } from '@/constants';

export interface ApiError {
  message: string;
  errors?: Record<string, Array<string>>;
}

/**
 * Fetch court details by court ID
 */
export const fetchCourtDetails = async (courtId: string, showErrorNotification = true): Promise<CourtDetailsData> => {
  return Sentry.startSpan({ name: 'Fetching court details' }, async () => {
    const response = await api.get<CourtDetailsData>(
      getAPIendpoint(`/entity/court/${courtId}`),
      { showErrorNotification } as any
    );
    return response.data;
  });
};
