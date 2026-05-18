import React from 'react'
import { Box, Grid, GridItem, HStack, Text, VStack } from '@chakra-ui/react'
import { FaGraduationCap, FaExclamationTriangle } from 'react-icons/fa'
import { STYLES, COLORS } from '@/features/shared/constants/StyleConstants'

interface LawStudentDetailsProps {
  details: {
    college?: string
    year?: string
    courseType?: string
    gradYear?: string
    academicInterests?: string
  }
}

export const LawStudentDetails: React.FC<LawStudentDetailsProps> = ({ details }) => {
  const { college, year, courseType, gradYear, academicInterests } = details

  // Check if all essential data is missing
  const hasNoData =
    !college && !year && !courseType && !gradYear && !academicInterests

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
          <FaGraduationCap color="#1E40AF" size={22} />
          <Text
            {...STYLES.text.h2}
            {...STYLES.font.semibold}
            color={COLORS.neutral[800]}
          >
            Professional Details
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
            No professional details available
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
        <FaGraduationCap color="#1E40AF" size={22} />
        <Text
          {...STYLES.text.h2}
          {...STYLES.font.semibold}
          color={COLORS.neutral[800]}
        >
          Academic Information
        </Text>
      </HStack>

      {/* Two Column Layout */}
      <Grid templateColumns="repeat(2, 1fr)" gap={6} mb={academicInterests ? 6 : 0}>
        {/* Left Column */}
        <GridItem>
          <VStack gap={4} align="stretch">
            <Box>
              <Text
                {...STYLES.text.body.small}
                color={COLORS.text.secondary}
                mb={1}
              >
                College/University
              </Text>
              <Text
                {...STYLES.text.body.medium}
                color={COLORS.text.primary}
                fontWeight="medium"
              >
                {college || '-'}
              </Text>
            </Box>

            <Box>
              <Text
                {...STYLES.text.body.small}
                color={COLORS.text.secondary}
                mb={1}
              >
                Course Type
              </Text>
              <Text
                {...STYLES.text.body.medium}
                color={COLORS.text.primary}
                fontWeight="medium"
              >
                {courseType?.toUpperCase() || '-'}
              </Text>
            </Box>
          </VStack>
        </GridItem>

        {/* Right Column */}
        <GridItem>
          <VStack gap={4} align="stretch">
            <Box>
              <Text
                {...STYLES.text.body.small}
                color={COLORS.text.secondary}
                mb={1}
              >
                Current Year/Semester
              </Text>
              <Text
                {...STYLES.text.body.medium}
                color={COLORS.text.primary}
                fontWeight="medium"
              >
                {year || '-'}
              </Text>
            </Box>

            <Box>
              <Text
                {...STYLES.text.body.small}
                color={COLORS.text.secondary}
                mb={1}
              >
                Expected Graduation Year
              </Text>
              <Text
                {...STYLES.text.body.medium}
                color={COLORS.text.primary}
                fontWeight="medium"
              >
                {gradYear || '-'}
              </Text>
            </Box>
          </VStack>
        </GridItem>
      </Grid>

      {/* Academic Interests */}
      {academicInterests && (
        <Box>
          <Text
            {...STYLES.text.body.small}
            color={COLORS.text.secondary}
            mb={1}
          >
            Academic Interests
          </Text>
          <Text
            {...STYLES.text.body.medium}
            color={COLORS.text.primary}
            fontWeight="medium"
          >
            {academicInterests}
          </Text>
        </Box>
      )}
    </Box>
  )
}

export default LawStudentDetails
