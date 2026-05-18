import { Box, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import type { TimelineEvent } from '../types'

import { COLORS } from '@/features/shared/constants/StyleConstants'

interface CaseTimelineProps {
  timeline: Array<TimelineEvent>
}

const CaseTimeline = ({ timeline }: CaseTimelineProps) => {
  // If no data available, show placeholder
  if (timeline.length === 0) {
    return (
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        shadow="sm"
        border="1px"
        borderColor={COLORS.neutral[200]}
      >
        <Heading size="sm" mb={4} color={COLORS.neutral[800]}>
          Case Timeline
        </Heading>
        <Text color={COLORS.text.tertiary} textAlign="center">
          No data available
        </Text>
      </Box>
    )
  }

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      shadow="sm"
      border="1px"
      borderColor={COLORS.neutral[200]}
    >
      <Heading size="sm" mb={4} color={COLORS.neutral[800]}>
        Case Timeline
      </Heading>
      <VStack gap={4} align="stretch">
        {timeline.map((event, index) => (
          <Flex key={index} gap={4}>
            <Box
              w={3}
              h={3}
              borderRadius="full"
              bg={
                event.status === 'completed'
                  ? 'blue.500'
                  : event.status === 'upcoming'
                    ? 'gray.300'
                    : 'yellow.500'
              }
              mt={1}
              flexShrink={0}
            />
            <Box flex={1}>
              <Flex justify="space-between" align="flex-start" mb={1}>
                <Text fontWeight="medium" color={COLORS.neutral[800]}>
                  {event.title}
                </Text>
                <Text fontSize="sm" color={COLORS.text.tertiary}>
                  {event.date}
                </Text>
              </Flex>
              <Text fontSize="sm" color={COLORS.text.secondary}>
                {event.description}
              </Text>
            </Box>
          </Flex>
        ))}
      </VStack>
    </Box>
  )
}

export default CaseTimeline
