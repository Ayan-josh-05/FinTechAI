import { useState } from 'react'
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'
import SourcesTabContent from './SourcesTabContent'
import type { SearchSource } from '@/features/SemanticSearch/api'

interface ChatSourcesSectionProps {
  jobId?: string
  sources?: SearchSource[]
  citations?: Array<{
    title: string
    url: string
    [key: string]: unknown
  }>
  sourcesCount: number
  isLoading?: boolean
  isStreaming?: boolean
  fromHistory?: boolean
  onNavigateToCase?: (caseId: string, caseTitle: string) => void
}

const ChatSourcesSection = ({
  sources,
  citations,
  sourcesCount,
  isLoading,
  onNavigateToCase,
}: ChatSourcesSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Use sources directly from props (now coming from stream)
  const displaySources = sources || []
  const displaySourcesCount = sourcesCount || 0

  // Don't render anything while streaming and no sources yet
  if (displaySourcesCount === 0) {
    return null
  }

  return (
    <VStack align="stretch" gap={2} mt={2}>
      {/* Sources Header - Collapsible */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        justifyContent="space-between"
        w="fit-content"
        px={3}
        py={2}
        h="auto"
        _hover={{ bg: 'gray.100' }}
      >
        <HStack gap={2}>
          <Text fontSize="sm" fontWeight="medium" color="gray.600">
            📚 {displaySourcesCount} {displaySourcesCount === 1 ? 'source' : 'sources'} found
          </Text>
          {isExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
        </HStack>
      </Button>

      {/* Collapsible Sources Content */}
      {isExpanded && (
        <Box
          mt={2}
          borderRadius="md"
          border="1px"
          borderColor="gray.200"
        >
          <SourcesTabContent
            sources={displaySources}
            citations={citations}
            isLoading={isLoading}
            onNavigateToCase={onNavigateToCase}
          />
        </Box>
      )}
    </VStack>
  )
}

export default ChatSourcesSection
