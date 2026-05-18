import { useState } from 'react'
import { Box, HStack, IconButton, Input } from '@chakra-ui/react'
import { FaArrowRight, FaStop } from 'react-icons/fa'
import { ToastNotifications } from '@/features/shared/components/ToastNotifications'
import { useSemanticSearchStore } from '@/features/SemanticSearch/store'
import { useNavigate } from '@tanstack/react-router'

interface ChatInputProps {
  disabled?: boolean
  isStreaming?: boolean
  onStopStreaming?: () => void
  onSendMessage?: (query: string) => void
}

const ChatInput = ({ disabled = false, isStreaming = false, onStopStreaming, onSendMessage }: ChatInputProps) => {
  const [query, setQuery] = useState('')
  const { currentChatId } = useSemanticSearchStore()
  const navigate = useNavigate()

  const handleSend = () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    if (!currentChatId) {
      ToastNotifications.error({
        title: 'No Active Chat',
        description: 'Please start a new search first.',
      })
      navigate({ to: '/semantic-search' })
      return
    }

    // Call parent callback to handle message sending
    if (onSendMessage) {
      onSendMessage(trimmedQuery)
      setQuery('')
    }
  }

  const handleStop = () => {
    if (onStopStreaming) {
      onStopStreaming()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Box
      position="fixed"
      bottom="0"
      left="320px"
      right="0"
      zIndex={1000}
      bg="transparent"
      p={4}
    >
      <Box maxW="800px" mx="auto">
        <Box
          bg="white"
          borderRadius="xl"
          boxShadow="md"
          border="1px solid"
          borderColor="gray.300"
          _hover={{
            borderColor: 'gray.400',
          }}
          _focusWithin={{
            borderColor: 'blue.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
          }}
        >
          <HStack gap={0}>
            <Input
              placeholder="Message Assistant..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={disabled}
              border="none"
              _focus={{
                boxShadow: 'none',
                outline: 'none',
              }}
              fontSize="md"
              color="gray.700"
              flex={1}
              _placeholder={{
                color: 'gray.500',
              }}
              px={4}
              py={3}
              h="52px"
            />
            {isStreaming ? (
              <IconButton
                aria-label="Stop streaming"
                size="md"
                variant="ghost"
                onClick={handleStop}
                color="red.500"
                _hover={{
                  bg: 'red.50',
                }}
                _active={{
                  bg: 'red.100',
                }}
                mr={2}
              >
                <FaStop />
              </IconButton>
            ) : (
              <IconButton
                aria-label="Send message"
                size="md"
                variant="ghost"
                onClick={handleSend}
                disabled={disabled || !query.trim() || isStreaming}
                _disabled={{
                  opacity: 0.3,
                  cursor: 'not-allowed',
                }}
                color={query.trim() ? 'blue.500' : 'gray.400'}
                _hover={{
                  bg: 'gray.100',
                }}
                _active={{
                  bg: 'gray.200',
                }}
                mr={2}
              >
                <FaArrowRight />
              </IconButton>
            )}
          </HStack>
        </Box>
      </Box>
    </Box>
  )
}

export default ChatInput
