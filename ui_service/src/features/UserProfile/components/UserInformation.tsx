import React from 'react'
import { Box, Grid, GridItem, HStack, Text, VStack } from '@chakra-ui/react'
import { FaExclamationTriangle, FaUser } from 'react-icons/fa'
import { STYLES } from '@/features/shared/constants/StyleConstants'

import { COLORS } from '@/features/shared/constants/StyleConstants'
interface UserInformationProps {
  fullName: string
  email: string
  phone: string
  location: string
}

export const UserInformation: React.FC<UserInformationProps> = ({
  fullName,
  email,
  phone,
  location,
}) => {
  // Check if all essential data is missing
  const hasNoData =
    fullName === '-' &&
    email === '-' &&
    phone === '-' &&
    location === '-'

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
          <FaUser color="#1E40AF" size={20} />
          <Text {...STYLES.text.h2} {...STYLES.font.semibold} color={COLORS.neutral[800]}>
            User Information
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
        <FaUser color="#1E40AF" size={20} />
        <Text {...STYLES.text.h2} {...STYLES.font.semibold} color={COLORS.neutral[800]}>
          User Information
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
                Full Name
              </Text>
              <Text
                {...STYLES.text.body.large}
                color={COLORS.neutral[800]}
                fontWeight="medium"
              >
                {fullName}
              </Text>
            </Box>

            <Box>
              <Text
                {...STYLES.text.body.medium}
                color={COLORS.text.tertiary}
                mb={1}
                fontWeight={'semibold'}
              >
                Phone Number
              </Text>
              <Text
                {...STYLES.text.body.large}
                color={COLORS.neutral[800]}
                fontWeight="medium"
              >
                {phone}
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
                color={COLORS.text.tertiary}
                mb={1}
                fontWeight={'semibold'}
              >
                Email Address
              </Text>
              <Text
                {...STYLES.text.body.large}
                color={COLORS.neutral[800]}
                fontWeight="medium"
              >
                {email}
              </Text>
            </Box>

            <Box>
              <Text
                {...STYLES.text.body.medium}
                color={COLORS.text.tertiary}
                mb={1}
                fontWeight={'semibold'}
              >
                Location
              </Text>
              <Text
                {...STYLES.text.body.large}
                color={COLORS.neutral[800]}
                fontWeight="medium"
              >
                {location}
              </Text>
            </Box>
          </VStack>
        </GridItem>
      </Grid>
    </Box>
  )
}

export default UserInformation
