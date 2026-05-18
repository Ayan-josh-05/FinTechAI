import React from 'react'
import { Text } from '@chakra-ui/react'
import type { TextProps } from '@chakra-ui/react'

import { COLORS } from '@/features/shared/constants/StyleConstants'
export interface LabelProps extends Omit<TextProps, 'htmlFor'> {
  children: React.ReactNode
  htmlFor?: string
  required?: boolean
}

export const Label: React.FC<LabelProps> = ({
  children,
  required = false,
  htmlFor,
  ...props
}) => {
  const labelProps = htmlFor ? { htmlFor } : {}
  
  return (
    <Text
      as="label"
      {...labelProps}
      fontSize="sm"
      fontWeight="medium"
      color={COLORS.neutral[700]}
      mb={2}
      display="block"
      {...props}
    >
      {children}
      {required && (
        <Text as="span" color={COLORS.error[500]} ml={1}>
          *
        </Text>
      )}
    </Text>
  )
}

export default Label