import { Box, Flex, Heading, Text } from '@chakra-ui/react'

import { COLORS } from '@/features/shared/constants/StyleConstants'
interface ProfessionalStatsProps {
  data: {
    casesWon: number
    totalCases: number
    winRate: number
    activeCases: number
  }
}

const ProfessionalStats = ({ data }: ProfessionalStatsProps) => {
  return (
    <Box
      bg="white"
      borderRadius="lg"
      border="1px solid"
      borderColor={COLORS.neutral[200]}
      boxShadow="sm"
      p={6}
    >
      <Heading size="md" mb={4} color={COLORS.neutral[800]}>
        Professional Statistics
      </Heading>

      <Box display="flex" flexDirection="column" gap={6}>
        {/* Large Display for Cases Won */}
        <Box textAlign="center" p={6} bg={COLORS.success[50]} borderRadius="lg">
          <Text fontSize="4xl" fontWeight="bold" color={COLORS.success[600]}>
            {data.casesWon}
          </Text>
          <Text fontSize="lg" color={COLORS.text.secondary} mb={2}>
            Cases Won
          </Text>
          <Box
            w="full"
            h="4px"
            bg={COLORS.neutral[200]}
            borderRadius="full"
            overflow="hidden"
          >
            <Box
              h="full"
              bg={COLORS.success[500]}
              w={`${(data.casesWon / data.totalCases) * 100}%`}
              borderRadius="full"
            />
          </Box>
        </Box>

        {/* Stats Grid */}
        <Box display="flex" flexDirection="column" gap={4} fontSize="medium">
          <Flex justify="space-between" align="center" w="full">
            <Text color={COLORS.text.secondary}>Total Cases:</Text>
            <Text fontWeight="bold" color={COLORS.primary[600]}>
              {data.totalCases}
            </Text>
          </Flex>
          <Flex justify="space-between" align="center" w="full">
            <Text color={COLORS.text.secondary}>Win Rate:</Text>
            <Text fontWeight="bold" color={COLORS.success[600]}>
              {data.winRate}%
            </Text>
          </Flex>
          <Flex justify="space-between" align="center" w="full">
            <Text color={COLORS.text.secondary}>Active Cases:</Text>
            <Text fontWeight="bold" color={COLORS.warning[600]}>
              {data.activeCases}
            </Text>
          </Flex>
        </Box>
      </Box>
    </Box>
  )
}
export default ProfessionalStats
