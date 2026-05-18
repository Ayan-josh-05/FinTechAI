import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Box, Flex, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { FaSearch } from 'react-icons/fa'
import ThinkingIndicator from './ThinkingIndicator'
import ChatMessage from './ChatMessage'
import ChatSourcesSection from './ChatSourcesSection'
import ChatInput from './ChatInput'
import SearchResultContent from './SearchResultContent'
import EmptyResponseMessage from './EmptyResponseMessage'
import FeedbackButtons from './FeedbackButtons'
import FeedbackModal from './FeedbackModal'
import { useSemanticSearchStore } from '@/features/SemanticSearch/store'
import type { ChatMessage as StoreChatMessage } from '@/features/SemanticSearch/store/useSemanticSearchStore'
import {
  useInfiniteChatHistory,
  useSendChatMessage,
} from '@/features/SemanticSearch/hooks'
import SearchHistorySidebar from '@/features/SemanticSearch/search/components/SearchHistorySidebar'
import { Button } from '@/features/shared/components'
import { useNavigationContext } from '@/utils/navigationContext'

const SemanticSearchResult = () => {
  const navigate = useNavigate()
  const { createNavigationWithContext } = useNavigationContext()
  const params = useParams({ strict: false })
  const search = useSearch({ strict: false })
  const { 
    currentQuestion, 
    setCurrentChatId, 
    currentChatId,
    setIsNewChat,
    isNewChat,
    chatMessages,
    setChatMessages,
    addChatMessage,
    updateChatMessage,
  } = useSemanticSearchStore()

  const chatId = params.id
  const fromHistory = !!search.fromHistory

  // Ref for auto-scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [thinkingMessages, setThinkingMessages] = useState<string[]>([])
  const [errorMessages, setErrorMessages] = useState<string[]>([])
  const [, setIsThinking] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  
  // Feedback modal state
  const [feedbackModalState, setFeedbackModalState] = useState<{
    isOpen: boolean
    messageId: string
    jobId?: string
    existingFeedback?: string
  }>({
    isOpen: false,
    messageId: '',
    jobId: undefined,
    existingFeedback: undefined
  })
  
  // Track if stream was stopped to prevent onSuccess from processing
  const wasStoppedRef = useRef(false)

  // Load chat history if coming from history with infinite scroll
  const {
    data: chatHistoryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingHistory,
    error: chatHistoryError,
    isError: isChatHistoryError,
  } = useInfiniteChatHistory(chatId || '', 10, fromHistory)

  // Flatten all pages into a single array
  // Reverse pages so older messages (page 2) appear before newer messages (page 1)
  // This creates ChatGPT-style pagination where scrolling up loads older messages at the top
  const allChatHistoryMessages = chatHistoryData?.pages
    .slice()
    .reverse()
    .flatMap((page:any) => page.results) ?? []

  // Send chat message mutation
  const sendChatMessage = useSendChatMessage()

  // Handle stop streaming
  const handleStopStreaming = useCallback(async () => {
    setIsStopping(true)
    wasStoppedRef.current = true  // Mark that stream was stopped
    
    try {
      await sendChatMessage.stopStreaming()
      
      // Update the current streaming message
      const streamingMsg = chatMessages.find(msg => msg.isStreaming)
      if (streamingMsg) {
        updateChatMessage(streamingMsg.id, {
          isStreaming: false,
        })
      }
      
      // Reset thinking/error states
      setIsThinking(false)
      setHasError(false)
      
    } catch (error) {
      console.error('Failed to stop streaming:', error)
    } finally {
      setIsStopping(false)
    }
  }, [sendChatMessage, chatMessages, updateChatMessage])

  const handleThinkingUpdate = useCallback((message: string) => {
    setThinkingMessages((prev) => [...prev, message])
  }, [])

  const handleErrorUpdate = useCallback((message: string) => {
    setErrorMessages((prev) => [...prev, message])
  }, [])

  const handleModeChange = useCallback((mode: 'thinking' | 'response' | 'error') => {
    if (mode === 'response') {
      setIsThinking(false)
      setHasError(false)
    } else if (mode === 'error') {
      setIsThinking(false)
      setHasError(true)
    } else if (mode === 'thinking') {
      setIsThinking(true)
      setHasError(false)
    }
  }, [])

  // Track scroll state in a structured way
  const scrollStateRef = useRef<{
    hasInitiallyScrolled: boolean
    isNearBottom: boolean
  }>({
    hasInitiallyScrolled: false,
    isNearBottom: !fromHistory  // Start at bottom for new chats, not for history
  })
  
  // Track previous scroll height for position preservation
  const previousScrollHeightRef = useRef<number>(0)
  
  // Track last formatted messages to prevent infinite loops
  const lastFormattedMessagesRef = useRef<StoreChatMessage[]>([])

  // Set chatId in store and clear messages when navigating to a different chat
  useEffect(() => {
    if (chatId) {
      // If this is a different chat than what's in the store, clear messages
      if (currentChatId !== chatId) {
        setChatMessages([])
        scrollStateRef.current = {
          hasInitiallyScrolled: false,
          isNearBottom: !fromHistory
        }
      }
      setCurrentChatId(chatId)
    }
  }, [chatId, currentChatId, setCurrentChatId, setChatMessages, fromHistory])

  // Memoize formatted messages to prevent unnecessary recalculations
  const formattedMessages = useMemo(() => {
    if (!fromHistory || allChatHistoryMessages.length === 0) return []
    
    const messages: StoreChatMessage[] = []
    
    // Process messages in the order received from API
    for (let i = 0; i < allChatHistoryMessages.length; i++) {
      const msg = allChatHistoryMessages[i]
      
      // Add user message
      if (msg.query) {
        messages.push({
          id: `${msg.id}-user`,
          role: 'user',
          query: msg.query,
        })
      }
      
      // Add assistant message - include even if output is null/empty
      messages.push({
        id: msg.id,
        role: 'assistant',
        output: msg.output || undefined,
        sources: msg.sources,
        jobId: msg.id,
      })
    }
    
    return messages
  }, [fromHistory, allChatHistoryMessages])

  // Update chat messages when formatted messages change
  useEffect(() => {
    if (formattedMessages.length > 0) {
      // Only update if the messages have actually changed
      const messagesChanged = 
        lastFormattedMessagesRef.current.length !== formattedMessages.length ||
        formattedMessages.some((msg, idx) => 
          !lastFormattedMessagesRef.current[idx] || 
          lastFormattedMessagesRef.current[idx].id !== msg.id
        )
      
      if (messagesChanged) {
        setChatMessages(formattedMessages)
        lastFormattedMessagesRef.current = formattedMessages
      }
    }
  }, [formattedMessages, setChatMessages])

  // Handle new chat - send first message
  useEffect(() => {
    if (isNewChat && chatId && currentQuestion && !fromHistory) {
      setIsNewChat(false)
      
      // Add user message
      const userMessage: StoreChatMessage = {
        id: `${Date.now()}-user`,
        role: 'user',
        query: currentQuestion,
      }
      addChatMessage(userMessage)
      
      // Add placeholder for assistant message
      const assistantMessageId = `${Date.now()}-assistant`
      const assistantMessage: StoreChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        output: '',
        isStreaming: true,
      }
      addChatMessage(assistantMessage)
      
      // Reset thinking state
      setThinkingMessages([])
      setErrorMessages([])
      setIsThinking(true)
      setHasError(false)
      
      // Send the first message
      sendChatMessage.mutate({
        chatId,
        query: currentQuestion,
        onUpdate: (partialResult) => {
          updateChatMessage(assistantMessageId, {
            output: partialResult.answer?.introduction || '',
          })
        },
        onThinkingUpdate: handleThinkingUpdate,
        onModeChange: handleModeChange,
        onErrorUpdate: handleErrorUpdate,
        onJobId: (jobId) => {
          updateChatMessage(assistantMessageId, {
            jobId: jobId,
          })
        },
      }, {
        onSuccess: (result) => {
          // If stream was stopped, still process sources but skip other completion logic
          if (wasStoppedRef.current) {
            updateChatMessage(assistantMessageId, {
              isStreaming: false,
              jobId: result.jobId,
              sources: result.sources || [],
            })
            wasStoppedRef.current = false  // Reset flag
            return
          }
          
          updateChatMessage(assistantMessageId, {
            output: result.answer?.introduction || '',
            isStreaming: false,
            jobId: result.jobId,
            sources: result.sources || [],
          })
          setIsThinking(false)
        },
        onError: (error) => {
          console.error('Error sending first message:', error)
          setHasError(true)
          setIsThinking(false)
          updateChatMessage(assistantMessageId, {
            isStreaming: false,
          })
        }
      })
    }
  }, [isNewChat, chatId, currentQuestion, fromHistory, sendChatMessage, addChatMessage, updateChatMessage, handleThinkingUpdate, handleModeChange, handleErrorUpdate, setIsNewChat])

  // Handle follow-up message
  const handleSendFollowUp = useCallback((query: string) => {
    if (!currentChatId) return
    
    // Add user message immediately
    const userMessage: StoreChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      query,
    }
    addChatMessage(userMessage)
    
    // Add placeholder for assistant message
    const assistantMessageId = `${Date.now()}-assistant`
    const assistantMessage: StoreChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      output: '',
      isStreaming: true,
    }
    addChatMessage(assistantMessage)
    
    // Reset thinking state
    setThinkingMessages([])
    setErrorMessages([])
    setIsThinking(true)
    setHasError(false)
    
    // Send the message
    sendChatMessage.mutate({
      chatId: currentChatId,
      query,
      onUpdate: (partialResult) => {
        updateChatMessage(assistantMessageId, {
          output: partialResult.answer?.introduction || '',
        })
      },
      onThinkingUpdate: handleThinkingUpdate,
      onModeChange: handleModeChange,
      onErrorUpdate: handleErrorUpdate,
      onJobId: (jobId) => {
        updateChatMessage(assistantMessageId, {
          jobId: jobId,
        })
      },
    }, {
      onSuccess: (result) => {
        // If stream was stopped, still process sources but skip other completion logic
        if (wasStoppedRef.current) {
          updateChatMessage(assistantMessageId, {
            isStreaming: false,
            jobId: result.jobId,
            sources: result.sources || [],
          })
          wasStoppedRef.current = false  // Reset flag
          return
        }
        
        updateChatMessage(assistantMessageId, {
          output: result.answer?.introduction || '',
          isStreaming: false,
          jobId: result.jobId,
          sources: result.sources || [],
        })
        setIsThinking(false)
      },
      onError: (error) => {
        console.error('Error sending follow-up message:', error)
        setHasError(true)
        setIsThinking(false)
        updateChatMessage(assistantMessageId, {
          isStreaming: false,
        })
      }
    })
  }, [currentChatId, addChatMessage, updateChatMessage, sendChatMessage, handleThinkingUpdate, handleModeChange, handleErrorUpdate])

  // Handle 404 error when loading chat history
  useEffect(() => {
    if (fromHistory && isChatHistoryError && chatHistoryError) {
      console.error('Error loading chat history:', chatHistoryError)
      
      // Only navigate back if initial load failed (no messages loaded yet)
      // For pagination errors, show inline error message instead
      if (chatMessages.length === 0) {
        navigate({ to: '/semantic-search' })
      }
    }
  }, [fromHistory, isChatHistoryError, chatHistoryError, chatMessages.length, navigate])

  // Scroll handler to detect when user reaches top (for pagination) and track position
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    
    // Update isNearBottom state
    const threshold = 100
    scrollStateRef.current.isNearBottom = scrollHeight - scrollTop - clientHeight < threshold
    
    // Fetch older messages when scrolling near the top
    const scrollThreshold = 200
    if (scrollTop < scrollThreshold && fromHistory) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, fromHistory])

  // Preserve scroll position when loading older messages
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    if (isFetchingNextPage) {
      previousScrollHeightRef.current = scrollContainer.scrollHeight
    } else if (previousScrollHeightRef.current > 0) {
      const newScrollHeight = scrollContainer.scrollHeight
      const heightDifference = newScrollHeight - previousScrollHeightRef.current
      
      if (heightDifference > 0) {
        scrollContainer.scrollTop += heightDifference
      }
      
      previousScrollHeightRef.current = 0
    }
  }, [isFetchingNextPage, allChatHistoryMessages])

  // Attach scroll listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Initial scroll to bottom for history chats (runs once after loading)
  useLayoutEffect(() => {
    if (fromHistory && 
        !isLoadingHistory && 
        chatMessages.length > 0 && 
        !scrollStateRef.current.hasInitiallyScrolled &&
        scrollContainerRef.current) {
      
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
      scrollStateRef.current.hasInitiallyScrolled = true
      scrollStateRef.current.isNearBottom = true
    }
  }, [fromHistory, isLoadingHistory, chatMessages.length])

  // Smart auto-scroll: only scroll to bottom if user is already at bottom
  useEffect(() => {
    if (scrollContainerRef.current && scrollStateRef.current.isNearBottom) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [chatMessages, thinkingMessages, errorMessages])

  // Handle feedback modal
  const handleDislikeClick = useCallback((messageId: string, jobId?: string, existingFeedback?: string) => {
    setFeedbackModalState({
      isOpen: true,
      messageId,
      jobId,
      existingFeedback
    })
  }, [])

  const handleCloseFeedbackModal = useCallback(() => {
    setFeedbackModalState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const handleBackToSearch = () => {
    navigate({ to: '/semantic-search' })
  }

  const isLoading = sendChatMessage.isPending
  
  // Check if any message is currently streaming (but not if we're stopping)
  const hasStreamingMessage = chatMessages.some(msg => msg.isStreaming) && !isStopping

  // Handle case where chatId is missing
  if (!chatId) {
    return (
      <Flex h="100vh" bg="gray.50" align="center" justify="center" p={6}>
        <Box
          bg="white"
          border="1px solid"
          borderColor="orange.200"
          borderRadius="lg"
          p={8}
          maxW="600px"
          w="100%"
          boxShadow="md"
        >
          <VStack align="stretch" gap={5}>
            <HStack justify="space-between" align="center">
              <HStack gap={3}>
                <Flex
                  align="center"
                  justify="center"
                  w="40px"
                  h="40px"
                  borderRadius="full"
                  bg="orange.100"
                  color="orange.500"
                >
                  <FaSearch />
                </Flex>
                <VStack align="start" gap={0}>
                  <Text fontSize="lg" fontWeight="bold" color="orange.600">
                    Invalid Chat
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    No chat ID found. Please start a new search.
                  </Text>
                </VStack>
              </HStack>
            </HStack>

            <HStack justify="flex-end">
              <Button
                variant="primary"
                onClick={handleBackToSearch}
              >
                Start New Search
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Flex>
    )
  }

  return (
    <Flex h="100vh" bg="gray.50">
      {/* Left Sidebar */}
      <SearchHistorySidebar />

      {/* Main Content */}
      <Flex flex={1} direction="column" bg="white">
        {/* Chat Messages Container - Full height scrollable area */}
        <Box 
          ref={scrollContainerRef}
          flex={1} 
          overflowY="auto" 
          p={6} 
          pt={12} 
          pb={24}
        >
          <VStack align="stretch" gap={6} w="100%" px={4}>
            {/* End of history indicator */}
            {fromHistory && !hasNextPage && !isLoadingHistory && chatMessages.length > 0 && (
              <Box textAlign="center" py={3}>
                <Text fontSize="xs" color="gray.400">
                  • Beginning of conversation •
                </Text>
              </Box>
            )}

            {/* Loading indicator at top for older messages */}
            {fromHistory && isFetchingNextPage && (
              <Box textAlign="center" py={3}>
                <Spinner size="sm" color="blue.500" />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Loading older messages...
                </Text>
              </Box>
            )}

            {/* Error indicator for pagination failures */}
            {fromHistory && isChatHistoryError && chatMessages.length > 0 && (
              <Box textAlign="center" py={3} bg="red.50" borderRadius="md" mx={4}>
                <Text fontSize="xs" color="red.600">
                  Failed to load older messages. Scroll up to try again.
                </Text>
              </Box>
            )}

            {/* Empty state when no messages exist */}
            {fromHistory && !isLoadingHistory && chatMessages.length === 0 && (
              <Box textAlign="center" py={8}>
                <Text fontSize="sm" color="gray.500">
                  No messages in this conversation
                </Text>
              </Box>
            )}
            
            {/* Render all messages */}
            {chatMessages.map((msg) => {
              // For user messages, just show the query text
              if (msg.role === 'user') {
                return (
                  <ChatMessage
                    key={msg.id}
                    role="user"
                    content={msg.query || ''}
                  />
                )
              }
              
              // For assistant messages
              // If streaming and no output yet, show thinking indicator
              if (msg.isStreaming && !msg.output) {
                return (
                  <ChatMessage
                    key={msg.id}
                    role="assistant"
                    content={<ThinkingIndicator messages={thinkingMessages} mode="thinking" />}
                  />
                )
              }
              
              // Check if output is empty
              const hasEmptyOutput = !msg.output || msg.output.trim() === '' || msg.output.trim() === '.'
              
              // For assistant messages with empty output and no sources, show empty response message
              if (!msg.isStreaming && hasEmptyOutput && !(msg.sources?.length)) {
                return (
                  <ChatMessage
                    key={msg.id}
                    role="assistant"
                    content={<EmptyResponseMessage errorMessage={errorMessages[0]} />}
                  />
                )
              }
              
              // For assistant messages with output but sources exist, show both content and sources
              if (!msg.isStreaming && hasEmptyOutput && msg.sources?.length) {
                return (
                  <ChatMessage
                    key={msg.id}
                    role="assistant"
                    content={<EmptyResponseMessage errorMessage={errorMessages[0]} />}
                  >
                    <ChatSourcesSection
                      jobId={msg.jobId}
                      sources={msg.sources}
                      citations={[]}
                      sourcesCount={msg.sources?.length || 0}
                      isLoading={false}
                      isStreaming={false}
                      fromHistory={fromHistory}
                      onNavigateToCase={(caseId: string, caseTitle: string) => {
                        const navigation = createNavigationWithContext(
                          '/case-details/$caseId',
                          { caseId },
                          { caseTitle },
                        )
                        navigate(navigation)
                      }}
                    />
                  </ChatMessage>
                )
              }
              
              // For assistant messages with content, use SearchResultContent for proper markdown rendering
              return (
                <ChatMessage
                  key={msg.id}
                  role="assistant"
                  content={
                    <SearchResultContent 
                      data={{
                        introduction: msg.output || '',
                        elements: []
                      }}
                      fromHistory={fromHistory}
                    />
                  }
                  feedbackSection={!msg.isStreaming && msg.output && msg.jobId ? (
                    <FeedbackButtons
                      messageId={msg.id}
                      jobId={msg.jobId}
                      currentFeedback={msg.feedback}
                      onDislikeClick={() => handleDislikeClick(msg.id, msg.jobId, msg.feedback?.feedbackText)}
                    />
                  ) : undefined}
                >
                  {/* Show sources for assistant messages */}
                  {!msg.isStreaming && (msg.sources?.length || 0) > 0 && (
                    <ChatSourcesSection
                      jobId={msg.jobId}
                      sources={msg.sources}
                      citations={[]}
                      sourcesCount={msg.sources?.length || 0}
                      isLoading={false}
                      isStreaming={false}
                      fromHistory={fromHistory}
                      onNavigateToCase={(caseId: string, caseTitle: string) => {
                        const navigation = createNavigationWithContext(
                          '/case-details/$caseId',
                          { caseId },
                          { caseTitle },
                        )
                        navigate(navigation)
                      }}
                    />
                  )}
                </ChatMessage>
              )
            })}

            {/* Show error indicator if there's an error */}
            {!fromHistory && hasError && errorMessages.length > 0 && (
              <ChatMessage
                role="assistant"
                content={<ThinkingIndicator messages={errorMessages} mode="error" />}
              />
            )}
          </VStack>
        </Box>

        {/* Chat Input - Fixed at bottom */}
        <ChatInput 
          disabled={isLoading && !isStopping} 
          isStreaming={hasStreamingMessage}
          onSendMessage={handleSendFollowUp}
          onStopStreaming={handleStopStreaming}
        />
      </Flex>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModalState.isOpen}
        onClose={handleCloseFeedbackModal}
        messageId={feedbackModalState.messageId}
        jobId={feedbackModalState.jobId}
        existingFeedback={feedbackModalState.existingFeedback}
      />
    </Flex>
  )
}

export default SemanticSearchResult
