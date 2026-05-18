import React from 'react'
import { Tabs as ChakraTabs } from '@chakra-ui/react'

export interface TabItem {
  value: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}

export interface TabsProps {
  items: Array<TabItem>
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  variant?: 'line' | 'enclosed' | 'outline' | 'plain' | 'subtle'
  size?: 'sm' | 'md' | 'lg'
  orientation?: 'horizontal' | 'vertical'
  isFitted?: boolean
  isLazy?: boolean
  colorScheme?: string
  children: React.ReactNode
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  defaultValue,
  value,
  onValueChange,
  variant = 'line',
  size = 'md',
  orientation = 'horizontal',
  isFitted = false,
  isLazy = false,
  colorScheme = 'primary',
  children,
  className,
}) => {
  return (
    <ChakraTabs.Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={(details) => onValueChange?.(details.value)}
      variant={variant}
      size={size}
      orientation={orientation}
      fitted={isFitted}
      lazyMount={isLazy}
      colorScheme={colorScheme}
      className={className}
    >
      <ChakraTabs.List>
        {items.map((item) => (
          <ChakraTabs.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            _selected={{
              color: 'blue.500',
              borderBottomColor: 'blue.500',
            }}
            _hover={{
              color: 'blue.500',
            }}
          >
            {item.icon && (
              <span style={{ marginRight: '8px' }}>{item.icon}</span>
            )}
            {item.label}
          </ChakraTabs.Trigger>
        ))}
      </ChakraTabs.List>
      {children}
    </ChakraTabs.Root>
  )
}

export interface TabContentProps {
  value: string
  children: React.ReactNode
}

export const TabContent: React.FC<TabContentProps> = ({ value, children }) => {
  return <ChakraTabs.Content value={value}>{children}</ChakraTabs.Content>
}
