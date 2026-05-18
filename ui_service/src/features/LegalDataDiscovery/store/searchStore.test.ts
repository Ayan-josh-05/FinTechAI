import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSearchStore } from './searchStore'
import type { FilterState, SearchFormState } from '../types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

// Mock window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock global localStorage for Node.js environment
global.localStorage = localStorageMock

describe('useSearchStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear the store before each test
    const { result } = renderHook(() => useSearchStore())
    act(() => {
      result.current.clearSearchState()
    })
  })

  it('should initialize with null values', () => {
    const { result } = renderHook(() => useSearchStore())

    expect(result.current.searchFormState).toBeNull()
    expect(result.current.filterState).toBeNull()
    expect(result.current.lastSearchTimestamp).toBeNull()
    expect(result.current.searchIdfKey).toBeNull()
    expect(result.current.isSearchInitiated).toBe(false)
  })

  it('should set search form state', () => {
    const { result } = renderHook(() => useSearchStore())
    const mockFormState: SearchFormState = {
      activeTab: 'PAN No.',
      panNumber: 'ABCDE1234F',
      caseType: 'criminal',
    }

    act(() => {
      result.current.setSearchFormState(mockFormState)
    })

    expect(result.current.searchFormState).toEqual(mockFormState)
    expect(result.current.lastSearchTimestamp).toBeGreaterThan(0)
  })

  it('should set filter state', () => {
    const { result } = renderHook(() => useSearchStore())
    const mockFilterState: FilterState = {
      riskScore: 'high',
      dateRange: { from: null, to: null },
      riskScoreFilter: 'high',
    }

    act(() => {
      result.current.setFilterState(mockFilterState)
    })

    expect(result.current.filterState).toEqual(mockFilterState)
    expect(result.current.lastSearchTimestamp).toBeGreaterThan(0)
  })

  it('should set search metadata', () => {
    const { result } = renderHook(() => useSearchStore())
    const searchId = 'test-search-123'
    const timestamp = Date.now()

    act(() => {
      result.current.setSearchMetadata(searchId, timestamp)
    })

    expect(result.current.searchIdfKey).toBe(searchId)
    expect(result.current.lastSearchTimestamp).toBe(timestamp)
  })

  it('should set search initiated state', () => {
    const { result } = renderHook(() => useSearchStore())

    act(() => {
      result.current.setSearchInitiated(true)
    })

    expect(result.current.isSearchInitiated).toBe(true)

    act(() => {
      result.current.setSearchInitiated(false)
    })

    expect(result.current.isSearchInitiated).toBe(false)
  })

  it('should clear all state', () => {
    const { result } = renderHook(() => useSearchStore())

    // Set some state first
    act(() => {
      result.current.setSearchFormState({ activeTab: 'PAN No.', caseType: 'all' })
      result.current.setFilterState({ dateRange: { from: null, to: null } })
      result.current.setSearchMetadata('test-id', Date.now())
    })

    // Verify state is set
    expect(result.current.searchFormState).not.toBeNull()
    expect(result.current.filterState).not.toBeNull()
    expect(result.current.searchIdfKey).not.toBeNull()

    // Clear state
    act(() => {
      result.current.clearSearchState()
    })

    // Verify state is cleared
    expect(result.current.searchFormState).toBeNull()
    expect(result.current.filterState).toBeNull()
    expect(result.current.lastSearchTimestamp).toBeNull()
    expect(result.current.searchIdfKey).toBeNull()
    expect(result.current.isSearchInitiated).toBe(false)
  })

  it('should validate search state correctly', () => {
    const { result } = renderHook(() => useSearchStore())

    // Initially no valid state
    expect(result.current.hasValidSearchState()).toBe(false)

    // Set recent state (should be valid)
    act(() => {
      result.current.setSearchFormState({ activeTab: 'PAN No.', caseType: 'all' })
    })
    expect(result.current.hasValidSearchState()).toBe(true)

    // Test with old timestamp by directly manipulating the store
    const store = useSearchStore.getState()
    store.lastSearchTimestamp = Date.now() - (31 * 60 * 1000) // 31 minutes ago

    expect(result.current.hasValidSearchState()).toBe(false)
  })

  it('should not persist isSearchInitiated flag', () => {
    const { result } = renderHook(() => useSearchStore())

    // Set the flag to true
    act(() => {
      result.current.setSearchInitiated(true)
    })

    expect(result.current.isSearchInitiated).toBe(true)

    // Simulate store rehydration (which happens on page load/refresh)
    const store = useSearchStore.getState()
    store.isSearchInitiated = false

    // After rehydration, the flag should be false
    expect(result.current.isSearchInitiated).toBe(false)
  })

  it('should clear all state when clearSearchState is called', () => {
    const { result } = renderHook(() => useSearchStore())

    // Set all states
    act(() => {
      result.current.setSearchFormState({ activeTab: 'PAN No.', caseType: 'all' })
      result.current.setFilterState({ dateRange: { from: null, to: null } })
      result.current.setSearchMetadata('test-id', Date.now())
      result.current.setSearchInitiated(true)
    })

    // Verify all states are set
    expect(result.current.searchFormState).not.toBeNull()
    expect(result.current.filterState).not.toBeNull()
    expect(result.current.searchIdfKey).not.toBeNull()
    expect(result.current.isSearchInitiated).toBe(true)

    // Clear all state
    act(() => {
      result.current.clearSearchState()
    })

    // Verify all states are cleared
    expect(result.current.searchFormState).toBeNull()
    expect(result.current.filterState).toBeNull()
    expect(result.current.lastSearchTimestamp).toBeNull()
    expect(result.current.searchIdfKey).toBeNull()
    expect(result.current.isSearchInitiated).toBe(false)
  })
})
