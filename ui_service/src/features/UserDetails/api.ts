// src/features/UserDetails/api.ts
import * as Sentry from '@sentry/tanstackstart-react'
import type { UserDetails } from './types/types'
import api from '@/integrations/axiosInterceptor'

export const fetchUserDetails = async (userId: string): Promise<UserDetails> => {
  return Sentry.startSpan({ name: 'Fetching user details' }, async () => {
    const response = await api.get(`/entity/user/${userId}`)
    return response.data
  })
}
