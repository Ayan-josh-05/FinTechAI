import { Box, Heading, Text } from '@chakra-ui/react'

import { COLORS } from '@/features/shared/constants/StyleConstants'

interface FinancialSummaryProps {
  financialSummary: string | null
}

const FinancialSummary = ({ financialSummary }: FinancialSummaryProps) => {
  // Check if financial summary is null or "N/A"
  const hasFinancialSummary =
    financialSummary &&
    financialSummary.trim() !== '' &&
    financialSummary.toUpperCase() !== 'N/A'

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
        Financial Summary
      </Heading>

      {hasFinancialSummary ? (
        <Text color={COLORS.text.secondary} fontSize="sm" lineHeight="1.6">
          {financialSummary}
        </Text>
      ) : (
        <Text color={COLORS.text.tertiary} textAlign="center">
          No financial summary available
        </Text>
      )}
    </Box>
  )
}

export default FinancialSummary
