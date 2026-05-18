import { useState } from 'react'
import { Box, VStack, HStack, Text, Icon } from '@chakra-ui/react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'

interface ThinkingIndicatorProps {
  messages: string[]
  mode?: 'thinking' | 'error'
}

const ThinkingIndicator = ({ messages, mode = 'thinking' }: ThinkingIndicatorProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (messages.length === 0) return null

  const hasMultipleMessages = messages.length >= 1

  // Determine colors based on mode
  const isError = mode === 'error'
  const bgColor = isError ? 'red.50' : 'gray.50'
  const borderColor = isError ? 'red.100' : 'blue.100'
  const dotColor = isError ? 'red.500' : 'blue.500'
  const hoverBgColor = isError ? 'red.100' : 'gray.100'
  const iconColor = isError ? 'red.500' : 'blue.500'
  const expandedBgColor = isError ? 'red.25' : 'blue.25'
  const expandedBorderColor = isError ? 'red.200' : 'blue.200'
  const stepBgColor = isError ? 'red.500' : 'blue.500'
  const stepBgColorInactive = isError ? 'red.300' : 'blue.300'

  return (
    <>
      {/* Inject keyframes animation */}
      <style>
        {`
          @keyframes pulse-thinking {
            0%, 100% {
              opacity: 0.4;
              transform: scale(1);
            }
            50% {
              opacity: 1;
              transform: scale(1.2);
            }
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}
      </style>
      
      <Box
        bg={bgColor}
        borderRadius="lg"
        border="1px solid"
        borderColor={borderColor}
        minW="400px"
        maxW="600px"
        w="100%"
        style={{
          animation: 'fadeIn 0.3s ease-in',
        }}
        overflow="hidden"
      >
        {/* Header - Latest thinking/error message */}
        <HStack
          p={4}
          align="start"
          gap={3}
          cursor={hasMultipleMessages ? 'pointer' : 'default'}
          onClick={() => hasMultipleMessages && setIsExpanded(!isExpanded)}
          _hover={hasMultipleMessages ? { bg: hoverBgColor } : {}}
          transition="background 0.2s"
        >
          {/* Animated pulse dot (only for thinking mode) */}
          <Box
            w="8px"
            h="8px"
            borderRadius="full"
            bg={dotColor}
            mt="6px"
            flexShrink={0}
            style={{
              animation: isError ? 'none' : 'pulse-thinking 1.5s ease-in-out infinite',
            }}
          />
          
          {/* Latest message text */}
          <Text
            fontSize="sm"
            color="gray.700"
            lineHeight="1.6"
            flex={1}
            fontWeight="medium"
          >
            <span>Thinking...</span> 
          </Text>

          {/* Expand/Collapse icon - only show if there are multiple messages */}
          {hasMultipleMessages && (
            <Icon
              as={isExpanded ? FaChevronUp : FaChevronDown}
              color={iconColor}
              boxSize={4}
              mt="4px"
              flexShrink={0}
            />
          )}
        </HStack>

        {/* Collapsible content - All thinking/error messages */}
        {hasMultipleMessages && (
          <Box
            borderTop="1px solid"
            borderColor={expandedBorderColor}
            bg={expandedBgColor}
            maxH={isExpanded ? '50vh' : '0'}
            overflowX="hidden"
            overflowY={isExpanded ? "auto" : "hidden"}
            transition="max-height 0.3s ease-in-out, opacity 0.3s ease-in-out"
            opacity={isExpanded ? 1 : 0}
          >
            <Box px={4} py={3}>
              <VStack align="stretch" gap={3}>
                <Text fontSize="xs" color="gray.600" fontWeight="semibold" mb={1}>
                  {isError ? 'Error Details' : 'Thinking Process'} ({messages.length} {isError ? 'messages' : 'steps'})
                </Text>
                {messages.map((message, index) => (
                  <HStack key={index} align="start" gap={3}>
                    {/* Step number */}
                    <Box
                      minW="20px"
                      h="20px"
                      borderRadius="full"
                      bg={index === messages.length - 1 ? stepBgColor : stepBgColorInactive}
                      color="white"
                      fontSize="xs"
                      fontWeight="bold"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                      mt="2px"
                    >
                      {index + 1}
                    </Box>
                    
                    {/* Message text */}
                    <Text
                      fontSize="sm"
                      color="gray.700"
                      lineHeight="1.6"
                      flex={1}
                      opacity={index === messages.length - 1 ? 1 : 0.8}
                    >
                      {message}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </Box>
        )}
      </Box>
    </>
  )
}

export default ThinkingIndicator
