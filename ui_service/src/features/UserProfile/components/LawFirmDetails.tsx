import React from 'react'
import { Box, Grid, GridItem, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { FaBuilding, FaExclamationTriangle, FaGlobe } from 'react-icons/fa'
import { STYLES, COLORS } from '@/features/shared/constants/StyleConstants'

interface LawFirmDetailsProps {
  details: {
    firmName?: string
    estYear?: string
    practiceAreas?: string
    locations?: string
    firmSize?: string
    website?: string
  }
}

export const LawFirmDetails: React.FC<LawFirmDetailsProps> = ({ details }) => {
  const { firmName, estYear, practiceAreas, locations, firmSize, website } = details

  // Check if all essential data is missing
  const hasNoData =
    !firmName && !estYear && !practiceAreas && !locations && !firmSize && !website

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
          <FaBuilding color="#1E40AF" size={20} />
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
        <FaBuilding color="#1E40AF" size={20} />
        <Text
          {...STYLES.text.h2}
          {...STYLES.font.semibold}
          color={COLORS.neutral[800]}
        >
          Firm Information
        </Text>
      </HStack>

      {/* Two Column Layout */}
      <Grid templateColumns="repeat(2, 1fr)" gap={6} mb={6}>
        {/* Left Column */}
        <GridItem>
          <VStack gap={4} align="stretch">
            <Box>
              <Text
                {...STYLES.text.body.small}
                color={COLORS.text.secondary}
                mb={1}
              >
                Firm Name
              </Text>
              <Text
                {...STYLES.text.body.medium}
                color={COLORS.text.primary}
                fontWeight="medium"
              >
                {firmName || '-'}
              </Text>
            </Box>

            <Box>
              <Text
                {...STYLES.text.body.small}
                color={COLORS.text.secondary}
                mb={1}
              >
                Practice Areas
              </Text>
              <Text
                {...STYLES.text.body.medium}
                color={COLORS.text.primary}
                fontWeight="medium"
              >
                {practiceAreas || '-'}
              </Text>
            </Box>

            <Box>
              <Text
                {...STYLES.text.body.small}
                color={COLORS.text.secondary}
                mb={1}
              >
                Firm Size
              </Text>
              <Text
                {...STYLES.text.body.medium}
                color={COLORS.text.primary}
                fontWeight="medium"
              >
                {firmSize || '-'}
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
                Establishment Year
              </Text>
              <Text
                {...STYLES.text.body.medium}
                color={COLORS.text.primary}
                fontWeight="medium"
              >
                {estYear || '-'}
              </Text>
            </Box>

            <Box>
              <Text
                {...STYLES.text.body.small}
                color={COLORS.text.secondary}
                mb={1}
              >
                Office Locations
              </Text>
              <Text
                {...STYLES.text.body.medium}
                color={COLORS.text.primary}
                fontWeight="medium"
              >
                {locations || '-'}
              </Text>
            </Box>

            {website && (
              <Box>
                <Text
                  {...STYLES.text.body.small}
                  color={COLORS.text.secondary}
                  mb={1}
                >
                  Website
                </Text>
                <Link
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  color={COLORS.primary[600]}
                  fontWeight="medium"
                  display="flex"
                  alignItems="center"
                  gap={2}
                  _hover={{ textDecoration: 'underline' }}
                >
                  <FaGlobe />
                  Visit Website
                </Link>
              </Box>
            )}
          </VStack>
        </GridItem>
      </Grid>
    </Box>
  )
}

export default LawFirmDetails
