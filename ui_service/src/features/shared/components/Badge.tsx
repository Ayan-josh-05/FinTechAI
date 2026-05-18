import React from 'react'
import { Text } from '@chakra-ui/react'
import { COLORS } from '../constants/StyleConstants'
import type { TextProps } from '@chakra-ui/react'

// Define the allowed types for badge styling
export type BadgeType =
  | 'high'
  | 'medium'
  | 'low'
  | 'active'
  | 'inactive'
  | 'warning'
  | 'success'
  | 'closed'
  | 'review'
  | 'info'

// Props for each badge item
export interface BadgeItem {
  text: string
  type: BadgeType | string // Allow both BadgeType and string for backward compatibility
  rounded?: boolean
}

export interface BadgeProps extends Omit<TextProps, 'children'> {
  items: Array<BadgeItem> // ✅ accepts an array of { text, type }
}

// Centralized style map for all badge types
const BADGE_STYLES: Record<BadgeType, { bg: string; color: string }> = {
  high: { bg: COLORS.error[100], color: COLORS.error[700] },
  medium: { bg: COLORS.warning[100], color: COLORS.warning[700] },
  low: { bg: COLORS.success[100], color: COLORS.success[700] },
  active: { bg: COLORS.success[100], color: COLORS.success[700] },
  inactive: { bg: COLORS.neutral[100], color: COLORS.neutral[700] },
  warning: { bg: COLORS.warning[100], color: COLORS.warning[700] },
  success: { bg: COLORS.success[100], color: COLORS.success[700] },
  closed: { bg: COLORS.neutral[100], color: COLORS.neutral[700] },
  review: { bg: COLORS.primary[100], color: COLORS.primary[700] },
  info: { bg: COLORS.primary[100], color: COLORS.primary[700] },
}

// Helper function to map string types to BadgeType
const mapStringTypeToBadgeType = (type: string): BadgeType => {
  const normalizedType = type.toLowerCase()

  if (normalizedType.includes('active')) return 'active'
  if (normalizedType.includes('pending') || normalizedType.includes('review'))
    return 'review'
  if (normalizedType.includes('closed') || normalizedType.includes('resolved'))
    return 'closed'
  if (
    normalizedType.includes('rejected') ||
    normalizedType.includes('cancelled')
  )
    return 'inactive'
  if (
    normalizedType.includes('approved') ||
    normalizedType.includes('verified')
  )
    return 'success'
  if (normalizedType.includes('warning')) return 'warning'
  if (normalizedType.includes('high')) return 'high'
  if (normalizedType.includes('medium')) return 'medium'
  if (normalizedType.includes('low')) return 'low'
  if (normalizedType.includes('info') || normalizedType.includes('lightblue'))
    return 'info'

  return 'inactive' // default
}

export const Badge: React.FC<BadgeProps> = ({ items, ...props }) => {
  return (
    <>
      {items.map(({ text, type, rounded }, index) => {
        // Handle both BadgeType and string types
        const badgeType: BadgeType =
          typeof type === 'string' && !Object.keys(BADGE_STYLES).includes(type)
            ? mapStringTypeToBadgeType(type)
            : (type as BadgeType)

        const { bg, color } = BADGE_STYLES[badgeType]

        return (
          <Text
            key={index}
            display="inline-flex"
            alignItems="center"
            px={rounded ? 4 : 2}
            py={1}
            borderRadius={`${rounded ? 'full' : 'sm'}`}
            fontSize="xs"
            fontWeight="normal"
            textTransform="capitalize"
            letterSpacing="wider"
            bg={bg}
            color={color}
            mr={2} // small gap between badges
            {...props}
          >
            {text}
          </Text>
        )
      })}
    </>
  )
}

export default Badge
