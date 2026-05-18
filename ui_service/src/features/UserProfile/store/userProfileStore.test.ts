import { act, renderHook } from '@testing-library/react'
import { useUserProfileStore } from './userProfileStore'
import type { GetCurrentUserResponse } from '@/features/Auth/api'

// Mock user data
const mockUserData: GetCurrentUserResponse = {
  id: 1,
  email: 'test@example.com',
  full_name: 'Test User',
  phone: '+919876543210',
  city: 'Mumbai',
  profile: {
    profile_type: 'Lawyer',
    fields: {
      designation: 'Senior Advocate',
      court: 'High Court of Bombay',
      court_name: 'High Court of Bombay',
      years_of_experience: '10',
      jurisdiction_area: 'Civil and Criminal',
      bar_registration_number: 'BAR123456',
      years_of_practice: '10',
      specialization_areas: ['Corporate Law', 'Criminal Law'],
      professional_bio: 'Experienced lawyer with expertise in corporate and criminal law.',
      profile_image: 'https://example.com/profile.jpg',
    },
  },
  is_active: true,
}

describe('UserProfileStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useUserProfileStore.getState().clearUserData()
    })
  })

  it('should initialize with null user data', () => {
    const { result } = renderHook(() => useUserProfileStore())

    expect(result.current.userData).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.hasUserData()).toBe(false)
  })

  it('should set user data correctly', () => {
    const { result } = renderHook(() => useUserProfileStore())

    act(() => {
      result.current.setUserData(mockUserData)
    })

    expect(result.current.userData).toEqual(mockUserData)
    expect(result.current.error).toBeNull()
    expect(result.current.hasUserData()).toBe(true)
  })

  it('should set loading state correctly', () => {
    const { result } = renderHook(() => useUserProfileStore())

    act(() => {
      result.current.setLoading(true)
    })

    expect(result.current.isLoading).toBe(true)

    act(() => {
      result.current.setLoading(false)
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('should set error state correctly', () => {
    const { result } = renderHook(() => useUserProfileStore())

    act(() => {
      result.current.setError('Test error')
    })

    expect(result.current.error).toBe('Test error')

    act(() => {
      result.current.setError(null)
    })

    expect(result.current.error).toBeNull()
  })

  it('should clear user data correctly', () => {
    const { result } = renderHook(() => useUserProfileStore())

    // First set some data
    act(() => {
      result.current.setUserData(mockUserData)
    })

    expect(result.current.hasUserData()).toBe(true)

    // Then clear it
    act(() => {
      result.current.clearUserData()
    })

    expect(result.current.userData).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.hasUserData()).toBe(false)
  })
})
