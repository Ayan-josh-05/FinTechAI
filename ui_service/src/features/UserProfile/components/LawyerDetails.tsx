import React from 'react'
import {
  Box,
  Grid,
  GridItem,
  HStack,
  Link,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'
import { FaBalanceScale, FaExclamationTriangle, FaLinkedin } from 'react-icons/fa'
import { STYLES, COLORS } from '@/features/shared/constants/StyleConstants'

interface LawyerDetailsProps {
  details: {
    barNumber?: string
    specialization?: string
    practiceYears?: string
    affiliatedFirm?: string
    linkedin?: string
    bio?: string
  }
}

export const LawyerDetails: React.FC<LawyerDetailsProps> = ({ details }) => {
  const { barNumber, specialization, practiceYears, affiliatedFirm, linkedin, bio } = details

  // Check if all essential data is missing
  const hasNoData =
    !barNumber && !specialization && !practiceYears && !affiliatedFirm && !linkedin && !bio

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
      {/* Legal Background */}
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
          <Text
            {...STYLES.text.h2}
            {...STYLES.font.semibold}
            color={COLORS.neutral[800]}
          >
            Legal Background
          </Text>
        </HStack>

        <Grid templateColumns="repeat(2, 1fr)" gap={6} mb={6}>
          {/* Left Column */}
          <GridItem>
            <Box>
              <Text
                {...STYLES.text.body.small}
                color={COLORS.text.secondary}
                mb={1}
              >
                Bar Registration Number
              </Text>
              <Text
                {...STYLES.text.body.medium}
                color={COLORS.text.primary}
                fontWeight="medium"
              >
                {barNumber || '-'}
              </Text>
            </Box>
          </GridItem>

          {/* Right Column */}
          <GridItem>
            <Box>
              <Text
                {...STYLES.text.body.small}
                color={COLORS.text.secondary}
                mb={1}
              >
                Years of Practice
              </Text>
              <Text
                {...STYLES.text.body.medium}
                color={COLORS.text.primary}
                fontWeight="medium"
              >
                {practiceYears || '-'}
              </Text>
            </Box>
          </GridItem>
        </Grid>

        {/* Specialization Areas */}
        {specialization && (
          <Box mb={6}>
            <Text
              {...STYLES.text.body.small}
              color={COLORS.text.secondary}
              mb={3}
            >
              Specialization Areas
            </Text>
            <Wrap gap={2}>
              <WrapItem>
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
                  {specialization?.toUpperCase()}
                </Box>
              </WrapItem>
            </Wrap>
          </Box>
        )}

        {/* Affiliated Firm */}
        {affiliatedFirm && (
          <Box mb={6}>
            <Text
              {...STYLES.text.body.small}
              color={COLORS.text.secondary}
              mb={1}
            >
              Affiliated Firm
            </Text>
            <Text
              {...STYLES.text.body.medium}
              color={COLORS.text.primary}
              fontWeight="medium"
            >
              {affiliatedFirm}
            </Text>
          </Box>
        )}

        {/* LinkedIn Profile */}
        {linkedin && (
          <Box>
            <Text
              {...STYLES.text.body.small}
              color={COLORS.text.secondary}
              mb={1}
            >
              LinkedIn Profile
            </Text>
            <Link
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              color={COLORS.primary[600]}
              fontWeight="medium"
              display="flex"
              alignItems="center"
              gap={2}
              _hover={{ textDecoration: 'underline' }}
            >
              <FaLinkedin />
              View Profile
            </Link>
          </Box>
        )}
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

export default LawyerDetails
