import {
  Box,
  HStack,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'

const AnswerTabSkeleton = () => {
  return (
    <Box overflowY="auto" p={2}>
      <VStack align="stretch" gap={6}>
        {/* Searching Text with Animation */}
        <HStack gap={3} align="center">
          <Spinner size="sm" color="blue.500" />
          <Text fontSize="sm" fontWeight="medium" color="gray.600">
            Searching Data...
          </Text>
        </HStack>
      </VStack>
    </Box>
  )
}

export default AnswerTabSkeleton
