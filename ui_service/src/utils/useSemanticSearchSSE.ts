import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSemanticSearchSSE } from './sseParser'
import type { ParsedSemanticSearchData } from './sseParser'

interface UseSemanticSearchSSEOptions {
  url?: string
  body?: unknown
  headers?: Record<string, string>
  enabled?: boolean
}

interface UseSemanticSearchSSEReturn {
  data: ParsedSemanticSearchData | null
  isLoading: boolean
  error: Error | null
  fetch: (url: string, options?: { body?: unknown; headers?: Record<string, string> }) => Promise<void>
  reset: () => void
}

/**
 * React hook for handling Semantic Search SSE streams
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error, fetch } = useSemanticSearchSSE()
 * 
 * useEffect(() => {
 *   fetch('/api/semantic-search', { body: { query: 'test' } })
 * }, [fetch])
 * ```
 */
export function useSemanticSearchSSE(
  options: UseSemanticSearchSSEOptions = {},
): UseSemanticSearchSSEReturn {
  const [data, setData] = useState<ParsedSemanticSearchData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const optionsRef = useRef(options)

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const fetch = useCallback(
    async (
      url: string,
      fetchOptions?: { body?: unknown; headers?: Record<string, string> },
    ) => {
      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      setIsLoading(true)
      setError(null)

      try {
        const currentOptions = optionsRef.current
        const result = await fetchSemanticSearchSSE(url, {
          body: fetchOptions?.body,
          headers: {
            ...currentOptions.headers,
            ...fetchOptions?.headers,
          },
          signal: abortController.signal,
          onUpdate: (updatedData) => {
            setData(updatedData)
          },
          onComplete: (completedData) => {
            setData(completedData)
            setIsLoading(false)
            if (abortControllerRef.current === abortController) {
              abortControllerRef.current = null
            }
          },
          onError: (err) => {
            setError(err)
            setIsLoading(false)
            if (abortControllerRef.current === abortController) {
              abortControllerRef.current = null
            }
          },
        })

        if (!abortController.signal.aborted) {
          setData(result)
          setIsLoading(false)
          if (abortControllerRef.current === abortController) {
            abortControllerRef.current = null
          }
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          const errObj = err instanceof Error ? err : new Error(String(err))
          setError(errObj)
          setIsLoading(false)
          if (abortControllerRef.current === abortController) {
            abortControllerRef.current = null
          }
        }
      }
    },
    [],
  )

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setData(null)
    setError(null)
    setIsLoading(false)
  }, [])

  // Auto-fetch if URL is provided and enabled
  useEffect(() => {
    if (options.url && options.enabled !== false) {
      fetch(options.url, {
        body: options.body,
        headers: options.headers,
      })
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [options.url, options.enabled, options.body, fetch])

  return {
    data,
    isLoading,
    error,
    fetch,
    reset,
  }
}
