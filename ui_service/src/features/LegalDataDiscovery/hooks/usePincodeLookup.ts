import { useState } from 'react'
import { getStateDistrictByPincode } from '../api'

export interface PincodeLookupResult {
  state: string
  district: string
}

export interface UsePincodeLookupReturn {
  isLoading: boolean
  error: string | null
  lookupByPincode: (pincode: string) => Promise<PincodeLookupResult | null>
  clearError: () => void
}

export const usePincodeLookup = (): UsePincodeLookupReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookupByPincode = async (pincode: string): Promise<PincodeLookupResult | null> => {
    if (!pincode || pincode.trim() === '' || pincode.length !== 6) {
      setError(null)
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getStateDistrictByPincode(pincode)
      return result
    } catch (err) {
      console.error('Error fetching state and district by pincode:', err)
      setError('Failed to fetch state and district information. Please try again.')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const clearError = () => {
    setError(null)
  }

  return {
    isLoading,
    error,
    lookupByPincode,
    clearError,
  }
}
