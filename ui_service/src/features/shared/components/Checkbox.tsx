import React from 'react'
import { Box } from '@chakra-ui/react'
import type { BoxProps } from '@chakra-ui/react'

export interface CheckboxProps extends Omit<BoxProps, 'onChange'> {
  children?: React.ReactNode
  id?: string
  checked?: boolean
  onChange?: (checked: boolean) => void
}

export const Checkbox: React.FC<CheckboxProps> = ({
  children,
  id,
  checked = false,
  onChange,
  ...props
}) => {
  return (
    <Box 
      as="label" 
      display="flex" 
      alignItems="center" 
      gap={2}
      cursor="pointer"
      {...props}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          onChange?.(e.target.checked)
        }}
        style={{ margin: 0 }}
      />
      {children}
    </Box>
  )
}

export default Checkbox