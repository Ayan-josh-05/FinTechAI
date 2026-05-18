export const SEARCH_LIMITS = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 500,
} as const

export const SEARCH_DEBOUNCE_MS = 300

export const QUERY_CONFIG = {
  STALE_TIME: {
    IMMEDIATE: 0,
    FIVE_MINUTES: 5 * 60 * 1000,
  },
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    INITIAL_PAGE: 1,
  },
} as const
