import { apiClient } from './client'

export const getHealth = () => apiClient.get('/health')
