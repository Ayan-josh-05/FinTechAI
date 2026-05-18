import { Box, Flex, Heading, Text } from '@chakra-ui/react'

import { COLORS } from '@/features/shared/constants/StyleConstants'
const CaseDistribution = (props: any) => {
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
          Case Distribution
        </Heading>
        <Box display="flex" flexDirection="column" gap={4}>
          {judgeData.caseDistribution.length > 0 ? (
            judgeData.caseDistribution.map((item: any, index: any) => (
              <Box key={index}>
                <Flex justify="space-between" mb={2}>
                  <Text fontSize="sm" color={COLORS.neutral[700]}>
                    {item.category}
                  </Text>
                  <Text
                    fontSize="sm"
                    fontWeight="normal"
                    color={COLORS.neutral[800]}
                  >
                    {item.percentage}%
                  </Text>
                </Flex>
                <Box
                  w="full"
                  h="8px"
                  bg={COLORS.neutral[200]}
                  borderRadius="full"
                  overflow="hidden"
                >
                  <Box
                    h="full"
                    bg={`${item.color}.500`}
                    w={`${item.percentage}%`}
                    borderRadius="full"
                  />
                </Box>
              </Box>
            ))
          ) : (
            <Text fontSize="sm" color={COLORS.text.tertiary}>
              No Data Available
            </Text>
          )}
        </Box>
      </Box>
    </>
  )
}

export default CaseDistribution
