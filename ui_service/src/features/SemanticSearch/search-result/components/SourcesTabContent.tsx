import { Badge, Box, HStack, Text, VStack } from '@chakra-ui/react'
import { FaFileAlt } from 'react-icons/fa'

interface Source {
  case_id?: string
  case_no?: string
  case_type?: string
  court?: string
  case_title?: string
}

interface Citation {
  title: string
  url: string
  [key: string]: unknown
}

interface SourcesTabContentProps {
  sources?: Array<Source>
  citations?: Array<Citation>
  isLoading?: boolean
  onNavigateToCase?: (caseId: string, caseTitle: string) => void
}

const SourcesTabContent = ({
  sources = [],
  isLoading = false,
  onNavigateToCase,
}: SourcesTabContentProps) => {
  const sourcesToShow = sources;

  const getTypeColor = (caseType: string | undefined) => {
    if (!caseType) return 'gray';
    const type = caseType.toLowerCase();
    if (type.includes('civil')) return 'blue';
    if (type.includes('criminal')) return 'red';
    if (type.includes('omp')) return 'purple';
    if (type.includes('mvop')) return 'green';
    return 'gray';
  };

  return (
    <Box maxH="calc(100vh - 300px)" overflowY="auto" p={1} mb={0}>
      <VStack align="stretch" gap={1}>
        {isLoading && (
          <Box 
            textAlign="center" 
            py={8} 
            border="1px"
            borderColor="gray.200"
            borderRadius="md"
            bg="white"
          >
            <Text fontSize="sm" color="gray.500">
              Loading sources...
            </Text>
            <Text fontSize="xs" color="gray.400" mt={1}>
              This may take a moment
            </Text>
          </Box>
        )}

        {sourcesToShow.map((source) => (
          <Box
            key={source.case_id}
            p={4}
            border="1px"
            borderColor="gray.200"
            borderRadius="md"
            bg="white"
            _hover={{ borderColor: 'blue.300', shadow: 'sm' }}
          >
            <VStack align="stretch" gap={2}>
              <HStack justify="space-between" align="start">
                <VStack align="start" gap={1} flex={1}>
                  <HStack gap={2}>
                    <FaFileAlt color="gray.500" />
                    <Text 
                      fontWeight="semibold" 
                      color="blue.600" 
                      fontSize="sm"
                      cursor="pointer"
                      _hover={{ textDecoration: "underline" }}
                      onClick={() => {
                        if (onNavigateToCase && source.case_id) {
                          onNavigateToCase(source.case_id, source.case_title || '');
                        } else if (source.case_id) {
                          window.location.href = `/case-details/${source.case_id}`;
                        }
                      }}
                    >
                      {source.case_title}
                    </Text>
                  </HStack>
                  {source.case_type && (
                    <Badge colorScheme={getTypeColor(source.case_type)} size="sm">
                      {source.case_type.toUpperCase()}
                    </Badge>
                  )}
                </VStack>
                <HStack gap={2}>
                  {source.case_no && (
                    <Badge colorScheme="blue" variant="subtle">
                      {source.case_no}
                    </Badge>
                  )}
                  {source.court && (
                    <Badge colorScheme="gray" variant="subtle">
                      {source.court}
                    </Badge>
                  )}
                </HStack>
              </HStack>
            </VStack>
          </Box>
        ))}
      </VStack>
    </Box>
  )
}

export default SourcesTabContent
