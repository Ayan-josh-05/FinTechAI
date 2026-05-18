import { Box, Flex, Heading, Text } from '@chakra-ui/react'

import { COLORS } from '@/features/shared/constants/StyleConstants'
const CaseStatistics = (props: any) => {
  const { data: judgeData } = props

  return (
    <>
      <Box
        bg="white"
        borderRadius="lg"
        border="1px solid"
        borderColor={COLORS.neutral[200]}
        boxShadow="sm"
        p={6}
      >
        <Heading size="md" mb={4} color={COLORS.neutral[800]}>
          Case Statistics
        </Heading>
        <Box display="flex" flexDirection="column" gap={4}>
          <Flex fontSize="sm" justify="space-between" align="center">
            <Text color={COLORS.text.secondary}>Total Cases Handled:</Text>
            <Text fontWeight="bold" color={COLORS.primary[600]}>
              {judgeData.caseStatistics.totalCasesHandled.toLocaleString()}
            </Text>
          </Flex>
          <Flex fontSize="sm" justify="space-between" align="center">
            <Text color={COLORS.text.secondary}>This Year:</Text>
            <Text fontWeight="bold" color={COLORS.success[600]}>
              {judgeData.caseStatistics.thisYear}
            </Text>
          </Flex>
          <Flex fontSize="sm" justify="space-between" align="center">
            <Text color={COLORS.text.secondary}>Pending Cases:</Text>
            <Text fontWeight="bold" color={COLORS.warning[600]}>
              {judgeData.caseStatistics.pendingCases}
            </Text>
          </Flex>
          <Flex fontSize="sm" justify="space-between" align="center">
            <Text color={COLORS.text.secondary}>Disposal Rate:</Text>
            <Text fontWeight="bold" color={COLORS.success[600]}>
              {judgeData.caseStatistics.disposalRate}%
            </Text>
          </Flex>
        </Box>
      </Box>
    </>
  )
}

export default CaseStatistics
