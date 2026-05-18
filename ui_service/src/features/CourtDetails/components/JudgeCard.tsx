import React from 'react'
import { Box, Flex, Grid, Text } from '@chakra-ui/react'
import type { Judge } from '@/features/CourtDetails/types'
import { COURT_DETAILS_TEXT } from '@/features/CourtDetails/constants'
import { Card, Badge } from '@/features/shared/components'

import { COLORS } from '@/features/shared/constants/StyleConstants'
interface JudgeCardProps {
  judge: Judge
}

interface JudgeDetailItemProps {
  label: string
  value: string | number
}

const JudgeDetailItem: React.FC<JudgeDetailItemProps> = ({ label, value }) => (
  <Flex gap={2}>
    <Text color={COLORS.text.secondary} fontSize="sm">
      {label}
    </Text>
    <Text fontWeight="medium" fontSize="sm">
      {value}
    </Text>
  </Flex>
)

export const JudgeCard: React.FC<JudgeCardProps> = ({ judge }) => {
  const { judge: judgeText } = COURT_DETAILS_TEXT
  console.log('judge', judge)

  return (
    <Card
      p={6}
      w="100%"
      variant="elevated"
      bg="white"
      borderRadius="lg"
      boxShadow="sm"
      border="1px solid"
      borderColor={COLORS.neutral[200]}
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: 'md',
      }}
      transition="all 0.2s ease"
    >
      <Flex justify="space-between" align="flex-start" mb={4}>
        <Box>
          <Text fontSize="lg" fontWeight="normal" color={COLORS.text.primary}>
            {judge.name}
          </Text>
          <Text fontSize="sm" color={COLORS.text.secondary}>
            {judge.position}
          </Text>
        </Box>
        <Badge items={judge.status} />
      </Flex>

      <Grid templateColumns="repeat(4, 1fr)" gap={4} fontSize="sm">
        <JudgeDetailItem
          label={judgeText.experience}
          value={judge.experience}
        />
        <JudgeDetailItem
          label={judgeText.specialization}
          value={judge.specialization}
        />
        <JudgeDetailItem
          label={judgeText.activeCases}
          value={judge.activeCases}
        />
      </Grid>
    </Card>
  )
}

export default JudgeCard
