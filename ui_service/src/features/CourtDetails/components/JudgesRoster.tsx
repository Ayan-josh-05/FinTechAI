import React from 'react'
import { Text, VStack } from '@chakra-ui/react'
import type { Judge } from '@/features/CourtDetails/types'
import { COURT_DETAILS_TEXT } from '@/features/CourtDetails/constants'
import { JudgeCard } from '@/features/CourtDetails/components/JudgeCard'
import { Card } from '@/features/shared/components'

import { COLORS } from '@/features/shared/constants/StyleConstants'

interface JudgesRosterProps {
  judges: ReadonlyArray<Judge>
}

export const JudgesRoster: React.FC<JudgesRosterProps> = ({ judges }) => {
  const { sections } = COURT_DETAILS_TEXT

  // Handle null or empty judges array
  if (judges.length === 0) {
    return (
      <Card
        p={6}
        variant="elevated"
        bg="white"
        borderRadius="lg"
        boxShadow="sm"
      >
        <Text
          fontSize="xl"
          fontWeight="semibold"
          mb={6}
          color={COLORS.neutral[800]}
        >
          {sections.judgesRoster}
        </Text>
        <Text
          fontSize="sm"
          color={COLORS.text.secondary}
          textAlign="center"
          py={4}
        >
          No associated judges available at this time.
        </Text>
      </Card>
    )
  }

  return (
    <Card p={6} variant="elevated" bg="white" borderRadius="lg" boxShadow="sm">
      <Text
        fontSize="xl"
        fontWeight="semibold"
        mb={6}
        color={COLORS.neutral[800]}
      >
        {sections.judgesRoster}
      </Text>
      <VStack gap={4}>
        {judges.map((judge, index) => (
          <JudgeCard key={index} judge={judge} />
        ))}
      </VStack>
    </Card>
  )
}

export default JudgesRoster
