import { Box, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import type { CaseStatus } from '../types'
import { Badge } from '@/features/shared/components'

import { COLORS } from '@/features/shared/constants/StyleConstants'
import { formatDateForDisplay } from '@/utils/dateUtils'

interface CurrentStatusProps {
  currentStatus: CaseStatus
}

const CurrentStatus = ({ currentStatus }: CurrentStatusProps) => {
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
        Current Status
      </Heading>
      <VStack gap={3} align="stretch">
        <Flex justify="space-between" align="center">
          <Text fontSize="sm" color={COLORS.text.secondary}>
            Stage:
          </Text>
          <Badge items={[{ text: currentStatus.stage, type: 'review' }]} />
        </Flex>
        <Flex justify="space-between" align="center">
          <Text fontSize="sm" color={COLORS.text.secondary}>
            Next Action:
          </Text>
          <Text fontSize="sm" fontWeight="medium">
            {currentStatus.nextAction}
          </Text>
        </Flex>
        <Flex justify="space-between" align="center">
          <Text fontSize="sm" color={COLORS.text.secondary}>
            Expected Duration:
          </Text>
          <Text fontSize="sm" fontWeight="medium">
            {currentStatus.expectedDuration}
          </Text>
        </Flex>
        {currentStatus.nextHearingDate && (
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color={COLORS.text.secondary}>
              Next Hearing Date:
            </Text>
            <Text fontSize="sm" fontWeight="medium">
              {formatDateForDisplay(currentStatus.nextHearingDate)}
            </Text>
          </Flex>
        )}
      </VStack>
    </Box>
  )
}

export default CurrentStatus
