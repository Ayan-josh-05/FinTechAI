import React from 'react'
import { Box, Center, Flex, Text, VStack } from '@chakra-ui/react'
import { FiMapPin } from 'react-icons/fi'

import type { CourtDetailsData } from '@/features/CourtDetails/types'
import { COURT_DETAILS_TEXT } from '@/features/CourtDetails/constants'
import { Card } from '@/features/shared/components'

import { COLORS } from '@/features/shared/constants/StyleConstants'

interface CourtLocationProps {
  courtData: CourtDetailsData
}

interface LocationInfoItemProps {
  icon: React.ReactNode
  title: string
  content: string | ReadonlyArray<string>
  iconColor?: string
}

const LocationInfoItem: React.FC<LocationInfoItemProps> = ({
  icon,
  title,
  content,
  iconColor = 'gray.600',
}) => (
  <Flex gap={3} align="center">
    <Center color={iconColor} flexShrink={0} w={6} h={6}>
      {icon}
    </Center>
    <Box>
      <Text
        fontWeight="semibold"
        mb={1}
        color={iconColor === 'blue.600' ? 'blue.600' : 'inherit'}
      >
        {title}
      </Text>
      {Array.isArray(content) ? (
        content.map((line, index) => (
          <Text key={index} fontSize="sm" color={COLORS.text.secondary}>
            {line}
          </Text>
        ))
      ) : (
        <Text fontSize="sm" color={COLORS.text.secondary}>
          {content}
        </Text>
      )}
    </Box>
  </Flex>
)

export const CourtLocation: React.FC<CourtLocationProps> = ({ courtData }) => {
  const { sections } = COURT_DETAILS_TEXT

  return (
    <Card p={6} variant="elevated" bg="white" borderRadius="lg" boxShadow="sm">
      <Text
        fontSize="xl"
        fontWeight="semibold"
        mb={4}
        color={COLORS.neutral[800]}
      >
        {sections.courtLocation}
      </Text>
      <VStack gap={3} align="flex-start">
        <Box p={4} bg={COLORS.neutral[50]} borderRadius="md" w="full">
          <LocationInfoItem
            icon={<FiMapPin size={20} />}
            title={courtData.location.name}
            content={courtData.location.address}
            iconColor={COLORS.primary[600]}
          />
        </Box>
      </VStack>
    </Card>
  )
}

export default CourtLocation
