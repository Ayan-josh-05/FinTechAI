import React from 'react'
import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { FaExclamationTriangle, FaGavel, FaMapMarkerAlt } from 'react-icons/fa'
import { COLORS, STYLES } from '@/features/shared/constants/StyleConstants'
import { Avatar } from '@/features/shared/components/Avatar'

interface ProfileSummaryProps {
  name: string
  designation: string
  court: string
  location: string
  profileType: string
}

export const ProfileSummary: React.FC<ProfileSummaryProps> = ({
  name,
  designation,
  court,
  location,
  profileType,
}) => {
  // Check if all essential data is missing
  const hasNoData = name === '-'

  // If no data available, show placeholder
  if (hasNoData) {
    return (
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        border="1px solid"
        borderColor={COLORS.neutral[200]}
        {...STYLES.shadow.sm}
      >
        <VStack gap={4} align="center">
          <Box
            w={32}
            h={32}
            borderRadius="full"
            bg={COLORS.neutral[100]}
            display="flex"
            alignItems="center"
            justifyContent="center"
            border="4px solid"
            borderColor="white"
            {...STYLES.shadow.md}
          >
            <FaExclamationTriangle color="#9CA3AF" size={48} />
          </Box>
          <VStack gap={2} align="center">
            <Text
              {...STYLES.text.body.large}
              color={COLORS.text.tertiary}
              textAlign="center"
              fontWeight="medium"
            >
              No data available
            </Text>
            <Text
              {...STYLES.text.body.small}
              color={COLORS.text.disabled}
              textAlign="center"
            >
              Profile information not found
            </Text>
          </VStack>
        </VStack>
      </Box>
    )
  }

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      border="1px solid"
      borderColor={COLORS.neutral[200]}
      {...STYLES.shadow.sm}
    >
      <VStack gap={3} align="center">
        {/* Profile Picture */}
        <Avatar
          name={name}
          size={32}
          borderWidth="4px"
          borderColor="white"
          fontSize="2xl"
          {...STYLES.shadow.md}
        />

        {/* Name */}
        <Text
          {...STYLES.text.h2}
          {...STYLES.font.semibold}
          color={COLORS.text.primary}
          textAlign="center"
        >
          {name.replace(/\b\w/g, (l) => l.toUpperCase())}
        </Text>

        {/* Profile Type Badge */}
        {profileType && profileType !== '-' && (
          <Box
            bg={COLORS.primary[100]}
            px={3}
            py={1}
            borderRadius="full"
            display="flex"
            alignItems="center"
            gap={2}
            {...STYLES.font.medium}
            {...STYLES.text.body.medium}
            color={COLORS.primary[700]}
          >
            <FaGavel size={16} />
            {profileType}
          </Box>
        )}

        {/* Designation */}
        {designation && designation !== '-' && (
          <Text
            {...STYLES.text.body.large}
            color={COLORS.primary[700]}
            fontSize="md"
            fontWeight="semibold"
            textAlign="center"
          >
            {designation?.toUpperCase()}
          </Text>
        )}

        {/* Court */}
        {court && court !== '-' && (
          <Text
            {...STYLES.text.body.large}
            color={COLORS.text.secondary}
            textAlign="center"
          >
            {court}
          </Text>
        )}

        {/* Location */}
        {location && location !== '-' && (
          <HStack gap={2} alignItems="center">
            <FaMapMarkerAlt color="#6B7280" size={14} />
            <Text {...STYLES.text.body.large} color={COLORS.text.secondary}>
              {location}
            </Text>
          </HStack>
        )}
      </VStack>
    </Box>
  )
}

export default ProfileSummary
