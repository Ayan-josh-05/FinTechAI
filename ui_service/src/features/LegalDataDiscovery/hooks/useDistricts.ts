import { useState } from 'react'
import { getDistrictsByState } from '../api'
import type { District } from '../types'

export interface UseDistrictsReturn {
  districts: Array<District>
  isLoading: boolean
  error: string | null
  fetchDistricts: (state: string) => Promise<void>
  clearDistricts: () => void
}

export const useDistricts = (): UseDistrictsReturn => {
  const [districts, setDistricts] = useState<Array<District>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDistricts = async (state: string) => {
    if (!state || state.trim() === '') {
      clearDistricts()
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await getDistrictsByState(state)

      // API response is already in the correct format [{label: "", value: ""}]
      setDistricts(response)
    } catch (err) {
      console.error('Error fetching districts:', err)
      setError('Failed to fetch districts. Please try again.')
      setDistricts([])
    } finally {
      setIsLoading(false)
    }
  }

  const clearDistricts = () => {
    setDistricts([])
    setError(null)
    setIsLoading(false)
  }

  return {
    districts,
    isLoading,
    error,
    fetchDistricts,
    clearDistricts,
  }
}
