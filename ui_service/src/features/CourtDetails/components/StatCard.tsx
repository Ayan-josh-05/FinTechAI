import React from 'react'
import { Box, Text } from '@chakra-ui/react'
import { FiInfo } from 'react-icons/fi'
import { Card, Tooltip } from '@/features/shared/components'
import { COLORS, STYLES } from '@/features/shared/constants/StyleConstants'

export interface StatCardProps {
  title: string
  value: string | number
  valueColor?: string
  icon?: React.ReactNode
  variant?: 'outline' | 'elevated' | 'filled'
  tooltip?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  valueColor = 'blue.600',
  icon,
  variant = 'elevated',
  tooltip,
}) => {
  const displayValue =
    typeof value === 'number' ? value.toLocaleString() : value

  const cardContent = (
    <Card
      p={6}
      variant={variant}
      textAlign="center"
      bg={COLORS.neutral[50]}
      border="1px solid"
      borderColor={COLORS.neutral[200]}
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: 'md',
        bg: 'white',
      }}
      {...STYLES.transition.all}
    >
      {icon && (
        <Box mb={2} display="flex" justifyContent="center">
          {icon}
        </Box>
      )}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        mb={2}
        gap={1}
      >
        <Text
          fontSize="sm"
          color={COLORS.text.secondary}
          {...STYLES.font.medium}
        >
          {title}
        </Text>
        {tooltip && (
          <Tooltip content={tooltip} positioning={{ placement: 'top' }}>
            <Box
              as={FiInfo}
              color={COLORS.text.secondary}
              w={3}
              h={3}
              cursor="pointer"
            />
          </Tooltip>
        )}
      </Box>
      <Text fontSize="3xl" fontWeight="bold" color={valueColor}>
        {displayValue}
      </Text>
    </Card>
  )

  return cardContent
}

export default StatCard
