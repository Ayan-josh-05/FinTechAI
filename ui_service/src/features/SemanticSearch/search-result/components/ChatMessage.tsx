import { Box, VStack } from '@chakra-ui/react'
import { FaUser, FaRobot } from 'react-icons/fa'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: React.ReactNode
  timestamp?: string
  children?: React.ReactNode
  feedbackSection?: React.ReactNode
}

const ChatMessage = ({ role, content, children, feedbackSection }: ChatMessageProps) => {
  const isUser = role === 'user'

  return (
    <Box w="100%">
      <Box 
        w="100%"
        display="flex"
        justifyContent={isUser ? 'flex-end' : 'flex-start'}
        gap={3}
      >
        {/* Avatar for assistant (left side) */}
        {!isUser && (
          <Box
            w="32px"
            h="32px"
            borderRadius="full"
            bg="green.500"
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
            fontSize="sm"
          >
            <FaRobot />
          </Box>
        )}

        {/* Message bubble */}
        <Box
          maxW="85%"
          bg={isUser ? 'blue.500' : 'gray.100'}
          color={isUser ? 'white' : 'gray.800'}
          p={4}
          borderRadius="2xl"
          boxShadow={isUser ? 'md' : 'sm'}
          border={isUser ? 'none' : '1px'}
          borderColor="gray.200"
        >
          <VStack align="stretch" gap={3}>
            {/* Message content */}
            <Box fontSize="md" lineHeight="1.7">
              {content}
            </Box>
            {children}
          </VStack>
        </Box>

        {/* Avatar for user (right side) */}
        {isUser && (
          <Box
            w="32px"
            h="32px"
            borderRadius="full"
            bg="blue.600"
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
            fontSize="sm"
          >
            <FaUser />
          </Box>
        )}
      </Box>

      {!isUser && feedbackSection && (
        <Box
          display="flex"
          justifyContent="flex-start"
          ml="44px"
          mt={2}
        >
          {feedbackSection}
        </Box>
      )}
    </Box>
  )
}

export default ChatMessage
