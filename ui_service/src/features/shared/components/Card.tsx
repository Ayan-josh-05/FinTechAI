import React from 'react'
import { Box } from '@chakra-ui/react'
import type { BoxProps } from '@chakra-ui/react'
import { COLORS } from '../constants/StyleConstants'

export interface CardProps extends BoxProps {
  children: React.ReactNode
  variant?: 'elevated' | 'outline' | 'filled'
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'outline':
        return {
          border: '1px solid',
          borderColor: COLORS.neutral[200],
          bg: COLORS.background.primary,
        }
      case 'filled':
        return {
          bg: COLORS.background.secondary,
          border: 'none',
        }
      case 'elevated':
      default:
        return {
          bg: COLORS.background.primary,
          boxShadow: 'sm',
          border: '1px solid',
          borderColor: COLORS.neutral[100],
        }
    }
  }

  return (
    <Box borderRadius="md" overflow="hidden" {...getVariantStyles()} {...props}>
      {children}
    </Box>
  )
}

export default Card
