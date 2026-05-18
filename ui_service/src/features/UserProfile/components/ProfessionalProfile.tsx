import React from 'react'
import { Box, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import { FaUserTie } from 'react-icons/fa6'
import { FaExclamationTriangle } from 'react-icons/fa'
import { STYLES } from '@/features/shared/constants/StyleConstants'

import { COLORS } from '@/features/shared/constants/StyleConstants'
interface ProfessionalProfileProps {
  bio: string
}

export const ProfessionalProfile: React.FC<ProfessionalProfileProps> = ({
  bio,
}) => {
  // Check if bio data is missing
  const hasNoData = bio === '-' || !bio || bio.trim() === ''

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
        <Flex alignItems="center" justifyContent="space-between" mb={6}>
          <HStack gap={3}>
            <FaUserTie color="#1E40AF" size={20} />
            <Text
              {...STYLES.text.h2}
              {...STYLES.font.semibold}
              color={COLORS.neutral[800]}
            >
              Professional Profile
            </Text>
          </HStack>
        </Flex>
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
      <Flex alignItems="center" justifyContent="space-between" mb={6}>
        <HStack gap={3}>
          <FaUserTie color="#1E40AF" size={20} />
          <Text {...STYLES.text.h2} {...STYLES.font.semibold} color={COLORS.neutral[800]}>
            Professional Profile
          </Text>
        </HStack>
      </Flex>

      {/* Bio Content */}
      <Box>
        <Text
          {...STYLES.text.body.large}
          color={COLORS.neutral[700]}
          lineHeight="1.6"
          textAlign="justify"
        >
          {bio}
        </Text>
      </Box>
    </Box>
  )
}

export default ProfessionalProfile
