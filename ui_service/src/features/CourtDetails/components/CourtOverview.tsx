import React from 'react'
import { Box, Grid, Text, VStack } from '@chakra-ui/react'
import type { CourtDetailsData } from '@/features/CourtDetails/types'
import { COURT_DETAILS_TEXT } from '@/features/CourtDetails/constants'
import { Card } from '@/features/shared/components'
import { StatCard } from '@/features/CourtDetails/components/StatCard'
import { COLORS } from '@/features/shared/constants/StyleConstants'

interface CourtOverviewProps {
  courtData: CourtDetailsData
}

export const CourtOverview: React.FC<CourtOverviewProps> = ({ courtData }) => {
  const { sections, statistics, tooltips } = COURT_DETAILS_TEXT

  return (
    <Card p={6} variant="elevated" bg="white" borderRadius="lg" boxShadow="sm">
      <VStack gap={6} align="stretch">
        {/* Header and Description */}
        <Box>
          <Text
            fontSize="xl"
            fontWeight="semibold"
            mb={4}
            color={COLORS.neutral[800]}
          >
            {sections.courtOverview}
          </Text>
          <Text color={COLORS.neutral[700]} lineHeight="relaxed" mb={6}>
            {courtData.overview}
          </Text>
        </Box>

        {/* Statistics Cards */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
          <StatCard
            title={statistics.totalCases}
            value={courtData.statistics.totalCases}
            valueColor={COLORS.primary[600]}
            variant="outline"
            tooltip={tooltips.totalCases}
          />
          <StatCard
            title={statistics.openCases}
            value={courtData.statistics.openCases}
            valueColor={COLORS.warning[600]}
            variant="outline"
            tooltip={tooltips.openCases}
          />
          <StatCard
            title={statistics.closedCases}
            value={courtData.statistics.closedCases}
            valueColor={COLORS.success[600]}
            variant="outline"
            tooltip={tooltips.closedCases}
          />
        </Grid>
      </VStack>
    </Card>
  )
}

export default CourtOverview
