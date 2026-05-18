import React from 'react'
import { Box, Flex, Text, VStack } from '@chakra-ui/react'
import type { CourtDetailsData } from '@/features/CourtDetails/types'
import { COURT_DETAILS_TEXT } from '@/features/CourtDetails/constants'
import { Card, ProgressBar } from '@/features/shared/components'

import { COLORS } from '@/features/shared/constants/StyleConstants'

interface CaseStatisticsProps {
  courtData: CourtDetailsData
}

interface SectionTitleProps {
  title: string
}

const SectionTitle: React.FC<SectionTitleProps> = ({ title }) => (
  <Text fontSize="md" fontWeight="medium" mb={3} color={COLORS.neutral[700]}>
    {title}
  </Text>
)

export const CaseStatistics: React.FC<CaseStatisticsProps> = ({
  courtData,
}) => {
  const { sections } = COURT_DETAILS_TEXT

  return (
    <Card p={6} variant="elevated" bg="white" borderRadius="lg" boxShadow="sm">
      {/* Main Section Title */}
      <Text
        fontSize="xl"
        fontWeight="semibold"
        mb={5}
        color={COLORS.neutral[800]}
      >
        {sections.caseStatistics}
      </Text>

      <VStack gap={6} align="stretch">
        {/* Case Status Distribution Section */}
        <Box>
          <SectionTitle title={sections.caseStatusDistribution} />
          {courtData.caseStatusData.length === 0 ? (
            <Text fontSize="sm" color={COLORS.text.secondary} textAlign="left">
              No case status distribution data available.
            </Text>
          ) : (
            <VStack gap={4} align="stretch">
              {courtData.caseStatusData.map((item, index) => (
                <Box key={index} w="100%">
                  <Flex align="center" w="100%" mb={3}>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      minWidth="130px"
                      mr={8}
                    >
                      {item.label}
                    </Text>
                    <Box flex="1">
                      <ProgressBar
                        value={item.percentage}
                        max={100}
                        color={item.color}
                      />
                    </Box>
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                      ml={3}
                      color={COLORS.neutral[700]}
                    >
                      {item.value}
                    </Text>
                  </Flex>
                </Box>
              ))}
            </VStack>
          )}
        </Box>

        {/* Case Types Section */}
        <Box>
          <SectionTitle title={sections.caseTypes} />
          <Box
            borderRadius="lg"
            border="1px solid"
            borderColor={COLORS.neutral[200]}
            overflow="hidden"
          >
            {/* Table Header */}
            <Flex
              bg={COLORS.neutral[50]}
              p={3}
              borderBottom="1px solid"
              borderColor={COLORS.neutral[200]}
            >
              <Text
                flex="1"
                fontSize="sm"
                fontWeight="medium"
                color={COLORS.text.secondary}
              >
                Case Type
              </Text>
              <Text
                width="100px"
                textAlign="right"
                fontSize="sm"
                fontWeight="medium"
                color={COLORS.text.secondary}
              >
                Case Count
              </Text>
            </Flex>

            {/* Table Content */}
            <VStack gap={0} align="stretch">
              {courtData.caseTypes.map((item, index) => (
                <Flex
                  key={index}
                  p={3}
                  align="center"
                  borderBottom={
                    index < courtData.caseTypes.length - 1
                      ? '1px solid'
                      : 'none'
                  }
                  borderColor={COLORS.neutral[200]}
                >
                  <Text flex="1" fontSize="sm" color={COLORS.text.secondary}>
                    {item.label}
                  </Text>
                  <Text
                    width="100px"
                    textAlign="right"
                    fontSize="sm"
                    fontWeight="medium"
                    color={COLORS.neutral[800]}
                  >
                    {item.value.toLocaleString()}
                  </Text>
                </Flex>
              ))}
            </VStack>
          </Box>
        </Box>
      </VStack>
    </Card>
  )
}

export default CaseStatistics
