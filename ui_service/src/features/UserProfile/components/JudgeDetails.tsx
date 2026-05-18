import React from 'react'
import { Box, Grid, GridItem, HStack, Text, VStack } from '@chakra-ui/react'
import { FaUniversity, FaExclamationTriangle } from 'react-icons/fa'
import { STYLES, COLORS } from '@/features/shared/constants/StyleConstants'

interface JudgeDetailsProps {
  details: {
    courtName?: string
    designation?: string
    experience?: string
    jurisdiction?: string
    bio?: string
  }
}

export const JudgeDetails: React.FC<JudgeDetailsProps> = ({ details }) => {
  const { courtName, designation, experience, jurisdiction, bio } = details

  // Check if all essential data is missing
  const hasNoData =
    !courtName && !designation && !experience && !jurisdiction && !bio

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
    <VStack gap={6} align="stretch">
      {/* Court Information */}
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
          <Text
            {...STYLES.text.h2}
            {...STYLES.font.semibold}
            color={COLORS.neutral[800]}
          >
            Court Information
          </Text>
        </HStack>

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
                  {courtName || '-'}
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
                  {experience || '-'}
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
                  {designation || '-'}
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
                  {jurisdiction || '-'}
                </Text>
              </Box>
            </VStack>
          </GridItem>
        </Grid>
      </Box>

      {/* Professional Bio */}
      {bio && (
        <Box
          bg="white"
          p={8}
          borderRadius="lg"
          border="1px solid"
          borderColor={COLORS.neutral[200]}
          {...STYLES.shadow.sm}
        >
          <Text
            {...STYLES.text.h2}
            {...STYLES.font.semibold}
            color={COLORS.neutral[800]}
            mb={4}
          >
            Professional Bio
          </Text>
          <Text
            {...STYLES.text.body.medium}
            color={COLORS.text.secondary}
            lineHeight="1.8"
          >
            {bio}
          </Text>
        </Box>
      )}
    </VStack>
  )
}

export default JudgeDetails
