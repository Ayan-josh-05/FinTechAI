import React from 'react'
import { Box, Text } from '@chakra-ui/react'
import { STYLES } from '../constants/StyleConstants'

import { COLORS } from '@/features/shared/constants/StyleConstants'
export interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  hasStripe?: boolean
  isAnimated?: boolean
  label?: string
  showPercentage?: boolean
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'blue',
  size = 'md',
  hasStripe = false,
  isAnimated = false,
  label,
  showPercentage = false,
  className,
}) => {
  // Ensure percentage is between 0 and 100
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100)
  
  const getColorScheme = (colorValue: string): string => {
    const normalizedColor = colorValue.toLowerCase()
    
    // Handle both direct color names and Tailwind-style class names
    if (normalizedColor.includes('red') || normalizedColor === 'red') return 'red'
    if (normalizedColor.includes('orange') || normalizedColor === 'orange') return 'orange'
    if (normalizedColor.includes('yellow') || normalizedColor === 'yellow') return 'yellow'
    if (normalizedColor.includes('green') || normalizedColor === 'green') return 'green'
    if (normalizedColor.includes('blue') || normalizedColor === 'blue') return 'blue'
    if (normalizedColor.includes('purple') || normalizedColor === 'purple') return 'purple'
    if (normalizedColor.includes('pink') || normalizedColor === 'pink') return 'pink'
    if (normalizedColor.includes('gray') || normalizedColor === 'gray') return 'gray'
    
    return 'blue' // fallback
  }

  const getHeightForSize = (sizeValue: 'xs' | 'sm' | 'md' | 'lg'): string => {
    const heightMap = {
      xs: '1',
      sm: '2', 
      md: '3',
      lg: '4'
    }
    return heightMap[sizeValue] || heightMap.md
  }

  const getProgressColor = (colorScheme: string): string => {
    const colorMap = {
      red: 'red.500',
      orange: 'orange.500',
      yellow: 'yellow.500',
      green: 'green.500',
      blue: 'blue.500',
      purple: 'purple.500',
      pink: 'pink.500',
      gray: 'gray.500'
    }
    return colorMap[colorScheme as keyof typeof colorMap] || colorMap.blue
  }

  const height = getHeightForSize(size)
  const colorScheme = getColorScheme(color)
  const progressColor = getProgressColor(colorScheme)

  // Stripe pattern styles
  const stripeStyles = hasStripe ? {
    backgroundImage: `linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)`,
    backgroundSize: '1rem 1rem',
  } : {}

  // Animation styles (simple pulsing for animated state)
  const animationStyles = isAnimated ? {
    animation: hasStripe 
      ? 'progress-move 1s linear infinite' 
      : 'progress-pulse 2s ease-in-out infinite',
  } : {}

  return (
    <Box w="100%" className={className}>
      {/* Progress Container */}
      <Box
        w="100%"
        h={height}
        bg={COLORS.neutral[200]}
        borderRadius="md"
        overflow="hidden"
        position="relative"
        {...STYLES.shadow.sm}
      >
        {/* Progress Bar */}
        <Box
          h="100%"
          w={`${percentage}%`}
          bg={progressColor}
          borderRadius="md"
          position="relative"
          overflow="hidden"
          {...STYLES.transition.all}
          {...stripeStyles}
          {...animationStyles}
          // Add subtle glow effect for better visibility
          boxShadow={`inset 0 1px 0 rgba(255,255,255,.3), 0 1px 2px rgba(0,0,0,.1)`}
        />
      </Box>

      {/* Label and Percentage */}
      {(showPercentage || label) && (
        <Box mt={2} fontSize="xs" color={COLORS.text.secondary}>
          {label && (
            <Text as="span" fontWeight="medium">
              {label}:{' '}
            </Text>
          )}
          {showPercentage && (
            <Text as="span" fontWeight="semibold" color={COLORS.neutral[700]}>
              {percentage}%
            </Text>
          )}
        </Box>
      )}

      {/* CSS Animations */}
      <style>
        {`
          @keyframes progress-move {
            0% { background-position: 0 0; }
            100% { background-position: 1rem 0; }
          }
          
          @keyframes progress-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
        `}
      </style>
    </Box>
  )
}

export default ProgressBar