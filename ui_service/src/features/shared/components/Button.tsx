import React, { forwardRef } from 'react'
import { Box, Button as ChakraButton, Spinner } from '@chakra-ui/react'
import {
  COMPONENT_STYLES,
  STYLES,
} from '@/features/shared/constants/StyleConstants'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'

export interface ButtonProps {
  variant?: ButtonVariant
  isLoading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const getVariantProps = (variant: ButtonVariant) => {
  switch (variant) {
    case 'primary':
      return STYLES.button.primary
    case 'secondary':
      return STYLES.button.secondary
    case 'outline':
      return STYLES.button.outline
    case 'ghost':
      return STYLES.button.ghost
    case 'danger':
      return STYLES.button.danger
    default:
      return STYLES.button.primary
  }
}

const getSizeProps = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return { px: 3, py: 1.5, fontSize: 'xs' }
    case 'md':
      return { px: 4, py: 2, fontSize: 'sm' }
    case 'lg':
      return { px: 6, py: 3, fontSize: 'base' }
    default:
      return { px: 4, py: 2, fontSize: 'sm' }
  }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      onClick,
      type = 'button',
      className = '',
      size = 'md',
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading
    const variantProps = getVariantProps(variant)
    const sizeProps = getSizeProps(size)

    return (
      <ChakraButton
        ref={ref}
        type={type}
        disabled={isDisabled}
        onClick={onClick}
        className={className}
        {...STYLES.button.base}
        {...variantProps}
        {...sizeProps}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" mr={2} />
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon && (
              <Box as="span" mr={2} {...COMPONENT_STYLES.Button.icon}>
                {leftIcon}
              </Box>
            )}
            {children}
            {rightIcon && (
              <Box as="span" ml={2} {...COMPONENT_STYLES.Button.icon}>
                {rightIcon}
              </Box>
            )}
          </>
        )}
      </ChakraButton>
    )
  },
)

Button.displayName = 'Button'
