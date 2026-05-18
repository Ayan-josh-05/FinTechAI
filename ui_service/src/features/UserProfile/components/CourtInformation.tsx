import React from 'react'
import { Box, Grid, GridItem, HStack, Text, VStack } from '@chakra-ui/react'
import { FaExclamationTriangle, FaUniversity } from 'react-icons/fa'
import { STYLES } from '@/features/shared/constants/StyleConstants'

import { COLORS } from '@/features/shared/constants/StyleConstants'
interface CourtInformationProps {
  courtName: string
  designation: string
  yearsOfExperience: string
  jurisdictionArea: string
}

export const CourtInformation: React.FC<CourtInformationProps> = ({
  courtName,
  designation,
  yearsOfExperience,
  jurisdictionArea,
}) => {
  // Check if all essential data is missing
  const hasNoData =
    courtName === '-' &&
    designation === '-' &&
    yearsOfExperience === '-' &&
    jurisdictionArea === '-'

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
          <FaUniversity color="#1E40AF" size={20} />
          <Text {...STYLES.text.h2} {...STYLES.font.semibold} color={COLORS.neutral[800]}>
            Court Information
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
        <FaUniversity color="#1E40AF" size={20} />
        <Text {...STYLES.text.h2} {...STYLES.font.semibold} color={COLORS.neutral[800]}>
          Court Information
        </Text>
      </HStack>

      {/* Two Column Layout */}
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        {/* Left Column */}
        <GridItem>
          <VStack gap={4} align="stretch">
            <Box>
              <Text
                {...STYLES.text.body.medium}
                fontWeight={'semibold'}
                color={COLORS.text.tertiary}
                mb={1}
              >
                Court Name
              </Text>
              <Text
                {...STYLES.text.body.large}
                color={COLORS.neutral[800]}
                fontWeight="medium"
              >
                {courtName}
              </Text>
            </Box>

            <Box>
              <Text
                {...STYLES.text.body.medium}
                fontWeight={'semibold'}
                color={COLORS.text.tertiary}
                mb={1}
              >
                Years of Experience
              </Text>
              <Text
                {...STYLES.text.body.large}
                color={COLORS.neutral[800]}
                fontWeight="medium"
              >
                {yearsOfExperience}
              </Text>
            </Box>
          </VStack>
        </GridItem>

        {/* Right Column */}
        <GridItem>
          <VStack gap={4} align="stretch">
            <Box>
              <Text
                {...STYLES.text.body.medium}
                fontWeight={'semibold'}
                color={COLORS.text.tertiary}
                mb={1}
              >
                Designation
              </Text>
              <Text
                {...STYLES.text.body.large}
                color={COLORS.neutral[800]}
                fontWeight="medium"
              >
                {designation}
              </Text>
            </Box>

            <Box>
              <Text
                {...STYLES.text.body.medium}
                fontWeight={'semibold'}
                color={COLORS.text.tertiary}
                mb={1}
              >
                Jurisdiction Area
              </Text>
              <Text
                {...STYLES.text.body.large}
                color={COLORS.neutral[800]}
                fontWeight="medium"
              >
                {jurisdictionArea}
              </Text>
            </Box>
          </VStack>
        </GridItem>
      </Grid>
    </Box>
  )
}

export default CourtInformation
