import React from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'
import type { IconType } from 'react-icons/lib'

import { COLORS } from '@/features/shared/constants/StyleConstants'
interface ActivityItemProps {
  icon: IconType
  title: string
  description: string
  time: string
  iconColor: 'success' | 'info' | 'warning' | 'error'
}

const getIconColor = (color: ActivityItemProps['iconColor']) => {
  switch (color) {
    case 'success':
      return { bg: 'green.100', color: 'green.600', border: 'green.200' }
    case 'info':
      return { bg: 'blue.100', color: 'blue.600', border: 'blue.200' }
    case 'warning':
      return { bg: 'yellow.100', color: 'yellow.600', border: 'yellow.200' }
    case 'error':
      return { bg: 'red.100', color: 'red.600', border: 'red.200' }
    default:
      return { bg: 'blue.100', color: 'blue.600', border: 'blue.200' }
  }
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  icon: Icon,
  title,
  description,
  time,
  iconColor,
}) => {
  const iconStyle = getIconColor(iconColor)

  return (
    <Flex
      alignItems="flex-start"
      gap={3}
      p={3}
      borderRadius="md"
      _hover={{ bg: 'gray.50' }}
      transition="all 0.2s"
    >
      {/* Icon with rounded square background */}
      <Box
        as="span"
        display="flex"
        alignItems="center"
        justifyContent="center"
        padding="2"
        borderRadius="xl"
        bg={iconStyle.bg}
        color={iconStyle.color}
        borderColor={iconStyle.border}
        flexShrink={0}
      >
        <Icon size={22} />
      </Box>

      <Box flex={1} minW={0}>
        <Text fontSize="lg" fontWeight="medium" color={COLORS.neutral[700]} mb={1}>
          {title}
        </Text>
        <Text fontSize="md" color={COLORS.text.secondary} mb={1} lineHeight="1.4">
          {description}
        </Text>
        <Text fontSize="md" color={COLORS.text.tertiary}>
          {time}
        </Text>
      </Box>
    </Flex>
  )
}

export default ActivityItem
