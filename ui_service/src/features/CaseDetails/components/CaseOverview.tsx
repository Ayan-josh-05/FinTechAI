import { Box, Grid, Heading, Text, VStack } from '@chakra-ui/react'
import type { CaseDetails } from '../types'

import { COLORS } from '@/features/shared/constants/StyleConstants'

interface CaseOverviewProps {
  caseDetails: CaseDetails
}

const CaseOverview = ({ caseDetails }: CaseOverviewProps) => {
  const { summary } = caseDetails

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
        Case Overview
      </Heading>
      <Text color={COLORS.neutral[700]} fontSize={"sm"} lineHeight="tall">
        {summary.description}
      </Text>
      <Grid templateColumns="1fr 1fr" gap={6} mt={6}>
        {summary.allegedAmount && (
          <Box
            borderRadius="lg"
            shadow="sm"
            border="1px"
            borderColor={COLORS.neutral[200]}
            p={4}
            background={COLORS.neutral[50]}
          >
            <Text fontSize="sm" color={COLORS.text.secondary} pb={2}>
              Alleged Amount
            </Text>
            <Text fontSize="xl" fontWeight="bold" color={COLORS.error[600]}>
              {summary.allegedAmount}
            </Text>
          </Box>
        )}
        {summary.casePeriod && (
          <Box
            borderRadius="lg"
            shadow="sm"
            border="1px"
            borderColor={COLORS.neutral[200]}
            p={4}
            background={COLORS.neutral[50]}
          >
            <Text fontSize="sm" color={COLORS.text.secondary} pb={2}>
              Case Period
            </Text>
            <Text
              fontSize="xl"
              fontWeight="semibold"
              color={COLORS.neutral[800]}
              pb={2}
            >
              {summary.casePeriod}
            </Text>
          </Box>
        )}
      </Grid>

      {summary.keyIssues && summary.keyIssues.length > 0 && (
        <Box mt={4}>
          <Text
            fontSize="sm"
            fontWeight="medium"
            color={COLORS.neutral[700]}
            mb={2}
          >
            Key Issues:
          </Text>
          <VStack align="stretch" gap={1}>
            {summary.keyIssues.map((issue, index) => (
              <Text key={index} fontSize="sm" color={COLORS.text.secondary}>
                • {issue}
              </Text>
            ))}
          </VStack>
        </Box>
      )}
    </Box>
  )
}

export default CaseOverview
