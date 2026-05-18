'use client'
import { Box, Portal, Select, createListCollection } from '@chakra-ui/react'
import { STYLES } from '../constants/StyleConstants'

import { COLORS } from '@/features/shared/constants/StyleConstants'

interface SelectProps {
  options: Array<{ value: string; label: string }>
  label: string
  placeholder: string
  value: string
  onChange?: (value: string) => void
  isRequired?: boolean
  bgColor?: string
  disabled?: boolean
  showClearButton?: boolean // New prop to control clear button visibility
}

const SelectComponent: React.FC<SelectProps> = (props) => {
  const {
    options,
    label,
    placeholder,
    value,
    onChange,
    isRequired = false,
    bgColor = 'white',
    disabled = false,
    showClearButton = true, // Default to true to maintain backward compatibility
  } = props
  const frameworks = createListCollection({ items: options })

  const handleValueChange = (details: { value: Array<string> }) => {
    if (onChange) {
      // Allow deselection - if array is empty, pass empty string
      onChange(details.value.length > 0 ? details.value[0] : '')
    }
  }

  return (
    <Select.Root
      collection={frameworks}
      width="100%"
      value={value ? [value] : []}
      onValueChange={disabled ? undefined : handleValueChange}
      disabled={disabled}
      multiple={false}
    >
      <Select.HiddenSelect />
      {label ? (
        <Select.Label>
          <Box
            as="label"
            {...STYLES.form.label.base}
            {...(isRequired ? STYLES.form.label.required : {})}
          >
            {label}
          </Box>
        </Select.Label>
      ) : (
        <></>
      )}
      <Select.Control>
        <Select.Trigger
          {...STYLES.form.input.base}
          {...STYLES.form.input.focus}
          bg={bgColor}
          _hover={
            disabled
              ? {}
              : { bg: bgColor === 'gray.100' ? 'gray.200' : 'gray.50' }
          }
          opacity={disabled ? 0.6 : 1}
          cursor={disabled ? 'not-allowed' : 'pointer'}
        >
          <Select.ValueText placeholder={placeholder} flex="1" textAlign="left">
            <Box fontSize="sm">
              {value
                ? options.find((opt) => opt.value === value)?.label || value
                : placeholder}
            </Box>
          </Select.ValueText>
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
          {value && !disabled && showClearButton && (
            <Select.ClearTrigger
              onClick={() => onChange?.('')}
              cursor="pointer"
              _hover={{ color: 'red.500' }}
            />
          )}
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content
            bg="white"
            border="1px solid"
            borderColor={COLORS.neutral[200]}
            borderRadius="md"
            boxShadow="lg"
            maxH="200px"
            overflowY="auto"
            zIndex={50}
          >
            {options.map((option) => (
              <Select.Item
                item={option}
                key={option.value}
                px={3}
                py={2}
                fontSize="sm"
                _hover={{ bg: 'blue.50' }}
                cursor="pointer"
              >
                {option.label}
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  )
}

export default SelectComponent
