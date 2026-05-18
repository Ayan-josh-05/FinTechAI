import { Box, Text, VStack } from '@chakra-ui/react'

interface EmptyResponseMessageProps {
  errorMessage?: string
}

const EmptyResponseMessage = ({ errorMessage }: EmptyResponseMessageProps) => {
  return (
    <Box
      p={6}
      bg="gray.50"
      borderRadius="md"
      border="1px solid"
      borderColor="gray.200"
    >
      <VStack align="center" gap={3}>
        <Text fontSize="lg" fontWeight="medium" color="gray.600">
          {errorMessage || 'No Response Generated'}
        </Text>
        <Text fontSize="sm" color="gray.500" textAlign="center">
          {errorMessage 
            ? 'The response generation was interrupted.'
            : 'A response was not generated for this particular query. This may happen if the query could not be processed or if there was an issue during the search.'
          }
        </Text>
      </VStack>
    </Box>
  )
}

export default EmptyResponseMessage
