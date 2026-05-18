import React from 'react'
import { Box, Stack } from '@chakra-ui/react'
import type { StackProps } from '@chakra-ui/react'

import { COLORS } from '@/features/shared/constants/StyleConstants'
export interface RadioGroupItemProps {
  value: string
  id?: string
  children?: React.ReactNode
  name?: string
  onChange?: (value: string) => void
  checked?: boolean
}

export const RadioGroupItem: React.FC<RadioGroupItemProps> = ({
  value,
  id,
  children,
  name,
  onChange,
  checked,
}) => {
  return (
    <Box
      as="label"
      display="flex"
      alignItems="center"
      gap={2}
      cursor="pointer"
      id={id}
    >
      <input
        type="radio"
        value={value}
        name={name}
        checked={checked}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          onChange?.(e.target.value)
        }}
        style={{ margin: 0 }}
      />
      <Box fontSize="sm" color={COLORS.neutral[700]}>
        {children}
      </Box>
    </Box>
  )
}

export interface RadioGroupProps extends Omit<StackProps, 'onChange'> {
  children: React.ReactNode
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
  name?: string
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  children,
  orientation = 'vertical',
  defaultValue,
  value,
  onChange,
  name,
  ...stackProps
}) => {
  // Clone children to pass down name, onChange, and checked state
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === RadioGroupItem) {
      return React.cloneElement(
        child as React.ReactElement<RadioGroupItemProps>,
        {
          name: name || 'radio-group',
          onChange,
          checked: value === (child.props as RadioGroupItemProps).value,
        },
      )
    }
    return child
  })

  return (
    <Stack
      direction={orientation === 'horizontal' ? 'row' : 'column'}
      gap={2}
      {...stackProps}
    >
      {enhancedChildren}
    </Stack>
  )
}

export default RadioGroup
