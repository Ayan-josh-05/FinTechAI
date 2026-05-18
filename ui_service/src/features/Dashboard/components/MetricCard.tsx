import React from 'react'
import { Box, Flex, HStack, Text } from '@chakra-ui/react'
import { FaArrowUp } from 'react-icons/fa6'

import { COLORS } from '@/features/shared/constants/StyleConstants'
interface MetricCardProps {
  title: string
  value: string
  change?: string
  badge?: string
  progress?: number
  progressLabel?: string
  progressValue?: string
  color: 'green' | 'blue' | 'red' | 'yellow'
}

const getColorScheme = (color: MetricCardProps['color']) => {
  switch (color) {
    case 'green':
      return {
        bg: 'green.50',
        text: 'green.600',
        progress: 'green.500',
        badge: 'green.100',
        progressBg: 'green.100',
      }
    case 'blue':
      return {
        bg: 'blue.50',
        text: 'blue.600',
        progress: 'blue.500',
        badge: 'blue.100',
        progressBg: 'blue.100',
      }
    case 'red':
      return {
        bg: 'red.50',
        text: 'red.600',
        progress: 'red.500',
        badge: 'red.100',
        progressBg: 'red.100',
      }
    case 'yellow':
      return {
        bg: 'yellow.50',
        text: 'yellow.600',
        progress: 'yellow.500',
        badge: 'yellow.100',
        progressBg: 'yellow.100',
      }
    default:
      return {
        bg: 'blue.50',
        text: 'blue.600',
        progress: 'blue.500',
        badge: 'blue.100',
        progressBg: 'blue.100',
      }
  }
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  badge,
  progress,
  progressLabel,
  progressValue,
  color,
}) => {
  const colorScheme = getColorScheme(color)

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      border="1px solid"
      borderColor={COLORS.neutral[200]}
      boxShadow="sm"
      _hover={{ boxShadow: 'md' }}
      transition="all 0.2s"
      position="relative"
      overflow="hidden"
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        marginBottom="4"
      >
        <Text fontSize="lg" fontWeight="medium" color={COLORS.text.tertiary}>
          {title}
        </Text>

        {badge && (
          <Box
            bg={colorScheme.badge}
            color={colorScheme.text}
            px={2}
            py={1}
            borderRadius="md"
            fontSize="xs"
            fontWeight="medium"
            letterSpacing="0.05em"
          >
            {badge}
          </Box>
        )}
      </Box>

      {/* Value and Change on same line with proper spacing */}
      <HStack gap={2} alignItems="baseline" mb={4}>
        <Text fontSize="2xl" fontWeight="bold" color={COLORS.text.primary} lineHeight="1">
          {value}
        </Text>
        {change && (
          <HStack gap={1} alignItems="center">
            <FaArrowUp color="38A169" />
            <Text fontSize="lg" color={COLORS.success[500]} fontWeight="medium">
              {change}
            </Text>
          </HStack>
        )}
      </HStack>

      {/* Progress Section */}
      {progress !== undefined && (
        <Box>
          {/* Progress Bar */}
          <Box
            w="full"
            h={2}
            bg={colorScheme.progressBg}
            borderRadius="full"
            overflow="hidden"
            mb={2}
          >
            <Box
              w={`${progress}%`}
              h="full"
              bg={colorScheme.progress}
              borderRadius="full"
              transition="width 0.3s ease"
            />
          </Box>

          {/* Labels below progress bar */}
          <Flex alignItems="center" justifyContent="space-between">
            <Text fontSize="sm" color={COLORS.text.tertiary}>
              {progressLabel}
            </Text>
            {progressValue && (
              <Text fontSize="sm" color={COLORS.text.secondary} fontWeight="medium">
                {progressValue}
              </Text>
            )}
          </Flex>
        </Box>
      )}
    </Box>
  )
}

export default MetricCard
