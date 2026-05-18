import { Box, HStack, VStack } from '@chakra-ui/react'
import Section from '@/features/UserDetails/components/Section'
import { COLORS } from '@/features/shared/constants'
import type { OrganizationSummary as OrganizationSummaryType } from '../types'

interface OrganizationSummaryProps {
  summary: OrganizationSummaryType
}

const OrganizationSummary = ({ summary }: OrganizationSummaryProps) => {
  return (
    <Section title="Organization Summary">
      <VStack gap={3} align="stretch">
        <HStack justifyContent="space-between">
            <Box color={"gray"}>Years in Business</Box>
            <Box fontSize={"xl"} fontWeight={"medium"}>{summary.yearsInBusiness} Years</Box>
        </HStack>
        <HStack justifyContent="space-between">
            <Box color={"gray"}>Active Cases</Box>
            <Box fontSize={"xl"} fontWeight={"medium"} color={COLORS.success[600]}>{summary.totalActiveCases}</Box>
        </HStack>
        <HStack justifyContent="space-between">
            <Box color={"gray"}>Closed Cases</Box>
            <Box fontSize={"xl"} fontWeight={"medium"}>{summary.totalClosedCases}</Box>
        </HStack>
      </VStack>
    </Section>
  )
}

export default OrganizationSummary
