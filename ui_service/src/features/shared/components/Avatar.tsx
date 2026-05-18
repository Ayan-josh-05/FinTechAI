import React from 'react'
import { Box, Text } from '@chakra-ui/react'
import { getAvatarColor, getInitials } from '@/utils/avatarUtils'

export interface AvatarProps {
  /**
   * The name to generate initials from
   */
  name: string
  /**
   * Size of the avatar. Can be a Chakra UI size token or custom size
   */
  size?: string | number
  /**
   * Custom background color. If not provided, a color will be generated based on the name
   */
  backgroundColor?: string
  /**
   * Text color for the initials
   */
  textColor?: string
  /**
   * Font size for the initials. If not provided, will be calculated based on size
   */
  fontSize?: string | number
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Border radius. Defaults to 'full' for circular avatar
   */
  borderRadius?: string
  /**
   * Border width
   */
  borderWidth?: string | number
  /**
   * Border color
   */
  borderColor?: string
}

/**
 * Avatar component that displays user initials with a colored background
 */
export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 12, // Default to size 12 (48px in Chakra UI)
  backgroundColor,
  textColor = 'white',
  fontSize,
  className,
  borderRadius = 'full',
  borderWidth,
  borderColor,
}) => {
  const initials = getInitials(name)
  const bgColor = backgroundColor || getAvatarColor(name)

  // Calculate font size based on avatar size if not provided
  const calculatedFontSize =
    fontSize ||
    (typeof size === 'number'
      ? '3rem'
      : typeof size === 'string' && size.includes('px')
        ? '3rem'
        : '3rem')

  return (
    <Box
      w={size}
      h={size}
      bg={bgColor}
      borderRadius={borderRadius}
      display="flex"
      alignItems="center"
      justifyContent="center"
      color={textColor}
      fontWeight="semibold"
      fontSize={calculatedFontSize}
      className={className}
      borderWidth={borderWidth}
      borderColor={borderColor}
      flexShrink={0}
    >
      <Text fontSize={calculatedFontSize} fontWeight="semibold" lineHeight={1}>
        {initials}
      </Text>
    </Box>
  )
}

export default Avatar
