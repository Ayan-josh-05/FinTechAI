import React from 'react'
import { Text } from '@chakra-ui/react'
import { TYPOGRAPHY } from '../constants/StyleConstants'
import type { TextProps } from '@chakra-ui/react'

export type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'subheading'
  | 'body-large'
  | 'body-medium'
  | 'body-small'
  | 'caption'
  | 'label'
  | 'button-large'
  | 'button-medium'
  | 'button-small'

export interface TypographyProps extends Omit<TextProps, 'children'> {
  variant: TypographyVariant
  children: React.ReactNode
}

const getTypographyStyles = (variant: TypographyVariant) => {
  switch (variant) {
    case 'h1':
      return TYPOGRAPHY.h1
    case 'h2':
      return TYPOGRAPHY.h2
    case 'h3':
      return TYPOGRAPHY.h3
    case 'h4':
      return TYPOGRAPHY.h4
    case 'subheading':
      return TYPOGRAPHY.subheading
    case 'body-large':
      return TYPOGRAPHY.body.large
    case 'body-medium':
      return TYPOGRAPHY.body.medium
    case 'body-small':
      return TYPOGRAPHY.body.small
    case 'caption':
      return TYPOGRAPHY.caption
    case 'label':
      return TYPOGRAPHY.label
    case 'button-large':
      return TYPOGRAPHY.button.large
    case 'button-medium':
      return TYPOGRAPHY.button.medium
    case 'button-small':
      return TYPOGRAPHY.button.small
    default:
      return TYPOGRAPHY.body.medium
  }
}

export const Typography: React.FC<TypographyProps> = ({
  variant,
  children,
  ...props
}) => {
  const typographyStyles = getTypographyStyles(variant)

  return (
    <Text {...typographyStyles} {...props}>
      {children}
    </Text>
  )
}

// Convenience components for common text patterns
export const H1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h1" {...props} />
)

export const H2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h2" {...props} />
)

export const H3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h3" {...props} />
)

export const H4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h4" {...props} />
)

export const Subheading: React.FC<Omit<TypographyProps, 'variant'>> = (
  props,
) => <Typography variant="subheading" {...props} />

export const BodyLarge: React.FC<Omit<TypographyProps, 'variant'>> = (
  props,
) => <Typography variant="body-large" {...props} />

export const BodyMedium: React.FC<Omit<TypographyProps, 'variant'>> = (
  props,
) => <Typography variant="body-medium" {...props} />

export const BodySmall: React.FC<Omit<TypographyProps, 'variant'>> = (
  props,
) => <Typography variant="body-small" {...props} />

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
)

export const Label: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="label" {...props} />
)

export default Typography
