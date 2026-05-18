import React from 'react'
import { Box, Flex, Spinner, Text } from '@chakra-ui/react'
import { STYLES } from '../constants/StyleConstants'

import { COLORS } from '@/features/shared/constants/StyleConstants'
export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  message?: string
  minHeight?: string | number
  fullScreen?: boolean
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'lg',
  message = 'Loading...',
  minHeight = '400px',
  fullScreen = false,
}) => {
  const containerProps = fullScreen
    ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bg: 'rgba(255, 255, 255, 0.8)',
        zIndex: 9999,
      }
    : {
        minH: minHeight,
      }

  return (
    <Box {...containerProps}>
      <Flex 
        {...STYLES.flexCenter}
        direction="column"
        gap={4}
        h={fullScreen ? '100vh' : minHeight}
      >
        <Spinner 
          size={size} 
          color={COLORS.primary[500]}
          {...STYLES.transition.all}
        />
        <Text 
          color={COLORS.text.secondary} 
          fontSize="sm"
          {...STYLES.font.medium}
        >
          {message}
        </Text>
      </Flex>
    </Box>
  )
}

// Page-specific loading components
export const PageLoading: React.FC<{ message?: string }> = ({ 
  message = 'Loading page...' 
}) => (
  <Loading size="lg" message={message} minHeight="60vh" />
)

export const ComponentLoading: React.FC<{ message?: string }> = ({ 
  message = 'Loading...' 
}) => (
  <Loading size="md" message={message} minHeight="200px" />
)

export const InlineLoading: React.FC<{ message?: string }> = ({ 
  message 
}) => (
  <Flex {...STYLES.flexCenter} gap={2} py={4}>
    <Spinner size="sm" color={COLORS.primary[500]} />
    {message && (
      <Text fontSize="sm" color={COLORS.text.secondary}>
        {message}
      </Text>
    )}
  </Flex>
)

export const FullScreenLoading: React.FC<{ message?: string }> = ({ 
  message = 'Loading application...' 
}) => (
  <Loading size="xl" message={message} fullScreen />
)

export default Loading