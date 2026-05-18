import React from 'react'
import {
  Box,
  Grid,
  GridItem,
  HStack,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'
import { FaBalanceScale, FaExclamationTriangle } from 'react-icons/fa'
import { STYLES } from '@/features/shared/constants/StyleConstants'

import { COLORS } from '@/features/shared/constants/StyleConstants'
interface LegalBackgroundProps {
  barRegistrationNumber: string
  yearsOfPractice: string
  specializationAreas: Array<string>
}

export const LegalBackground: React.FC<LegalBackgroundProps> = ({
  barRegistrationNumber,
  yearsOfPractice,
  specializationAreas,
}) => {
  // Check if all essential data is missing
  const hasNoData =
    barRegistrationNumber === '-' &&
    yearsOfPractice === '-' &&
    specializationAreas.length === 0

  // If no data available, show placeholder
  if (hasNoData) {
    return (
      <Box
        bg="white"
        p={8}
        borderRadius="lg"
        border="1px solid"
        borderColor={COLORS.neutral[200]}
        {...STYLES.shadow.sm}
      >
        <HStack gap={3} mb={6}>
          <FaBalanceScale color="#1E40AF" size={22} />
          <Text {...STYLES.text.h2} {...STYLES.font.semibold} color={COLORS.neutral[800]}>
            Legal Background
          </Text>
        </HStack>
        <VStack gap={4} align="center" py={8}>
          <FaExclamationTriangle color="#9CA3AF" size={32} />
          <Text
            {...STYLES.text.body.large}
            color={COLORS.text.tertiary}
            textAlign="center"
            fontWeight="medium"
          >
            No data available
          </Text>
        </VStack>
      </Box>
    )
  }

  return (
    <Box
      bg="white"
      p={8}
      borderRadius="lg"
      border="1px solid"
      borderColor={COLORS.neutral[200]}
      {...STYLES.shadow.sm}
    >
      {/* Header */}
      <HStack gap={3} mb={6}>
        <FaBalanceScale color="#1E40AF" size={22} />
        <Text {...STYLES.text.h2} {...STYLES.font.semibold} color={COLORS.neutral[800]}>
          Legal Background
        </Text>
      </HStack>

      {/* Two Column Layout */}
      <Grid templateColumns="repeat(2, 1fr)" gap={6} mb={6}>
        {/* Left Column */}
        <GridItem>
          <Box>
            <Text {...STYLES.text.body.small} color={COLORS.text.secondary} mb={1}>
              Bar Registration Number
            </Text>
            <Text
              {...STYLES.text.body.medium}
              color={COLORS.text.primary}
              fontWeight="medium"
            >
              {barRegistrationNumber}
            </Text>
          </Box>
        </GridItem>

        {/* Right Column */}
        <GridItem>
          <Box>
            <Text {...STYLES.text.body.small} color={COLORS.text.secondary} mb={1}>
              Years of Practice
            </Text>
            <Text
              {...STYLES.text.body.medium}
              color={COLORS.text.primary}
              fontWeight="medium"
            >
              {yearsOfPractice}
            </Text>
          </Box>
        </GridItem>
      </Grid>

      {/* Specialization Areas */}
      <Box>
        <Text {...STYLES.text.body.small} color={COLORS.text.secondary} mb={3}>
          Specialization Areas
        </Text>
        <Wrap gap={2}>
          {specializationAreas.map((area, index) => (
            <WrapItem key={index}>
              <Box
                bg={COLORS.neutral[100]}
                px={3}
                py={1}
                borderRadius="full"
                borderColor={COLORS.neutral[300]}
                {...STYLES.text.body.small}
                {...STYLES.font.medium}
                color={COLORS.neutral[700]}
              >
                {area}
              </Box>
            </WrapItem>
          ))}
        </Wrap>
      </Box>
    </Box>
  )
}

export default LegalBackground
