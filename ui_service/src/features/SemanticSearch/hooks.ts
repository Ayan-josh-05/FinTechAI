import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { semanticSearchApi } from './api'
import type { SemanticSearchResultById } from './api'
import { QUERY_CONFIG } from './constants'
import { ToastNotifications } from '@/features/shared/components/ToastNotifications'

export const useSearchHistory = (page: number = 1, pageSize: number = QUERY_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE) => {
  return useQuery({
    queryKey: ['semantic-search-history', page, pageSize],
    queryFn: () => semanticSearchApi.getSearchHistory(page, pageSize),
    staleTime: QUERY_CONFIG.STALE_TIME.IMMEDIATE, // Always consider data stale to refetch on mount
    refetchOnMount: 'always', // Always refetch when component mounts
  })
}

export const useInfiniteSearchHistory = (pageSize: number = QUERY_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE) => {
  return useInfiniteQuery({
    queryKey: ['semantic-search-history-infinite', pageSize],
    queryFn: ({ pageParam }: { pageParam: number }) => semanticSearchApi.getSearchHistory(pageParam, pageSize),
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.page_size)
      const nextPage = lastPage.page + 1
      return nextPage <= totalPages ? nextPage : undefined
    },
    initialPageParam: QUERY_CONFIG.PAGINATION.INITIAL_PAGE,
    staleTime: QUERY_CONFIG.STALE_TIME.IMMEDIATE,
    refetchOnMount: 'always',
  })
}

export const useSemanticSearchResultById = (
  id: string,
  enabled: boolean = true,
  fromHistory: boolean = false,
  onUpdate?: (partialResult: Partial<SemanticSearchResultById>) => void,
  onThinkingUpdate?: (message: string) => void,
  onModeChange?: (mode: 'thinking' | 'response' | 'error') => void,
  onErrorUpdate?: (message: string) => void,
  onStreamComplete?: () => void
) => {
  // Use a ref to store the latest callback - updated in useEffect to avoid stale closures
  const onUpdateRef = useRef(onUpdate)
  const onThinkingUpdateRef = useRef(onThinkingUpdate)
  const onModeChangeRef = useRef(onModeChange)
  const onErrorUpdateRef = useRef(onErrorUpdate)
  const onStreamCompleteRef = useRef(onStreamComplete)

  // Update ref whenever callback changes
  useEffect(() => {
    onUpdateRef.current = onUpdate
    onThinkingUpdateRef.current = onThinkingUpdate
    onModeChangeRef.current = onModeChange
    onErrorUpdateRef.current = onErrorUpdate
    onStreamCompleteRef.current = onStreamComplete
  }, [onUpdate, onThinkingUpdate, onModeChange, onErrorUpdate, onStreamComplete])

  const queryKey = ['semantic-search-result', id, fromHistory]

  return useQuery({
    queryKey,
    queryFn: () => {
      // Create streaming callback that reads from ref at invocation time
      const streamingCallback = (partialResult: Partial<SemanticSearchResultById>) => {
        const callback = onUpdateRef.current
        if (callback) {
          try {
            callback(partialResult)
          } catch (error) {
            console.error('Error in streaming callback:', error)
          }
        }
      }

      // Create thinking callback
      const thinkingCallback = (message: string) => {
        const callback = onThinkingUpdateRef.current
        if (callback) {
          try {
            callback(message)
          } catch (error) {
            console.error('Error in thinking callback:', error)
          }
        }
      }

      // Create mode change callback
      const modeChangeCallback = (mode: 'thinking' | 'response' | 'error') => {
        const callback = onModeChangeRef.current
        if (callback) {
          try {
            callback(mode)
          } catch (error) {
            console.error('Error in mode change callback:', error)
          }
        }
      }

      // Create error callback
      const errorCallback = (message: string) => {
        const callback = onErrorUpdateRef.current
        if (callback) {
          try {
            callback(message)
          } catch (error) {
            console.error('Error in error callback:', error)
          }
        }
      }

      // For non-history requests, we need to handle stream completion
      if (!fromHistory) {
        return semanticSearchApi.getSearchResultById(
          id,
          streamingCallback,
          thinkingCallback,
          modeChangeCallback,
          errorCallback
        ).then((result) => {
          // Call onStreamComplete when the streaming is finished
          const streamCompleteCallback = onStreamCompleteRef.current
          if (streamCompleteCallback) {
            try {
              streamCompleteCallback()
            } catch (error) {
              console.error('Error in stream complete callback:', error)
            }
          }
          return result
        })
      }

      return semanticSearchApi.getSearchResultFromHistory(id)
    },
    enabled: enabled && !!id,
    staleTime: QUERY_CONFIG.STALE_TIME.FIVE_MINUTES, // Cache for 5 minutes to reduce unnecessary API calls
    retry: false,
  })
}


export const useSendChatMessage = () => {
  const queryClient = useQueryClient()
  const jobIdRef = useRef<string | undefined>(undefined)
  
  const mutation = useMutation({
    mutationFn: ({ 
      chatId, 
      query,
      onUpdate,
      onThinkingUpdate,
      onModeChange,
      onErrorUpdate,
      onJobId
    }: {
      chatId: string
      query: string
      onUpdate?: (partial: Partial<SemanticSearchResultById>) => void
      onThinkingUpdate?: (msg: string) => void
      onModeChange?: (mode: 'thinking' | 'response' | 'error') => void
      onErrorUpdate?: (msg: string) => void
      onJobId?: (jobId: string) => void
    }) => {
      return semanticSearchApi.sendChatMessage(
        chatId, 
        query, 
        onUpdate, 
        onThinkingUpdate, 
        onModeChange, 
        onErrorUpdate,
        (jobId: string) => {
          jobIdRef.current = jobId
          if (onJobId) {
            onJobId(jobId)
          }
        }
      )
    },
    retry: false,  // Disable automatic retries to prevent duplicate calls after stop
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semantic-search-history'] })
      queryClient.invalidateQueries({ queryKey: ['semantic-search-history-infinite'] })
    }
  })
  
  const stopStreaming = async () => {
    const jobId = jobIdRef.current
    if (!jobId) {
      console.warn('No jobId available to stop streaming')
      return
    }
    
    try {
      const result = await semanticSearchApi.stopStreamingResponse(jobId)
      
      // Show success toast
      ToastNotifications.success({
        title: 'Response Stopped',
        description: result.message || 'Stream cancelled successfully',
      })
      
      // Don't reset mutation - let it complete naturally when stream ends
      // The stream will receive final chunks (error, sources, [DONE]) and complete on its own
      
    } catch (error) {
      console.error('Error stopping stream:', error)
      
      // Show error toast
      ToastNotifications.error({
        title: 'Failed to Stop',
        description: 'Could not stop the response. Please try again.',
      })
      
      throw error
    }
  }
  
  return {
    ...mutation,
    stopStreaming
  }
}

export const useChatHistory = (chatId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['chat-history', chatId],
    queryFn: () => semanticSearchApi.getChatHistory(chatId),
    enabled: enabled && !!chatId,
    staleTime: QUERY_CONFIG.STALE_TIME.IMMEDIATE,
    refetchOnMount: 'always',
  })
}

export const useInfiniteChatHistory = (chatId: string, pageSize: number = QUERY_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE, enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: ['chat-history-infinite', chatId, pageSize],
    queryFn: ({ pageParam }: { pageParam: number }) => semanticSearchApi.getChatHistory(chatId, pageParam, pageSize),
    getNextPageParam: (lastPage, allPages) => {
      // If last page has fewer items than pageSize, we've reached the end
      if (lastPage.results.length < pageSize) {
        return undefined
      }
      return allPages.length + 1
    },
    initialPageParam: QUERY_CONFIG.PAGINATION.INITIAL_PAGE,
    enabled: enabled && !!chatId,
    staleTime: QUERY_CONFIG.STALE_TIME.FIVE_MINUTES, // Cache for 5 minutes to reduce unnecessary API calls
    refetchOnMount: false, // Don't refetch on every mount, use cached data
  })
}
