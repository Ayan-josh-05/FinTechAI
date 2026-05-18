import React, { useCallback, useState } from 'react'
import { Box, Input, Spinner, Text } from '@chakra-ui/react'
import { COLORS } from '@/features/shared/constants/StyleConstants'
import {
  COMPONENT_STYLES,
  STYLES,
} from '@/features/shared/constants/StyleConstants'

export interface AsyncSelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface AsyncSelectProps {
  options: Array<AsyncSelectOption>
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  placeholder?: string
  noOptionsMessage?: string
  onSearch?: (searchTerm: string) => void
  onChange?: (value: string | number) => void
  searchPlaceholder?: string
  minSearchLength?: number
  value?: string
  disabled?: boolean
  className?: string
}

export const AsyncSelect: React.FC<AsyncSelectProps> = ({
  options,
  isLoading = false,
  isError = false,
  errorMessage = 'Failed to load options',
  placeholder = 'Select an option...',
  noOptionsMessage = 'No options available',
  onSearch,
  onChange,
  searchPlaceholder = 'Search...',
  minSearchLength = 0,
  value,
  disabled = false,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleSearch = useCallback(
    (searchValue: string) => {
      setSearchTerm(searchValue)
      if (onSearch && searchValue.length >= minSearchLength) {
        onSearch(searchValue)
      }
    },
    [onSearch, minSearchLength],
  )

  const handleChange = useCallback(
    (selectedValue: string) => {
      onChange?.(selectedValue)
      setIsOpen(false)
    },
    [onChange],
  )

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <Box {...COMPONENT_STYLES.AsyncSelect.container} className={className}>
      <Box position="relative">
        <select
          value={value}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            handleChange(e.target.value)
          }
          onFocus={(e) => {
            setIsOpen(true)
            e.target.style.borderColor = '#3182ce'
            e.target.style.boxShadow = '0 0 0 1px #3182ce'
          }}
          disabled={disabled || isLoading}
          style={{
            ...(isError ? { borderColor: '#e53e3e' } : {}),
            ...STYLES.select.base,
          }}
          onMouseEnter={(e) => {
            if (!isError) {
              e.currentTarget.style.borderColor = '#cbd5e0'
            }
          }}
          onMouseLeave={(e) => {
            if (!isError) {
              e.currentTarget.style.borderColor = '#e2e8f0'
            }
          }}
          onBlur={(e) => {
            setTimeout(() => setIsOpen(false), 200)
            if (!isError) {
              e.target.style.borderColor = '#e2e8f0'
              e.target.style.boxShadow = 'none'
            }
          }}
        >
          <option value="">{placeholder}</option>
          {filteredOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      </Box>

      {isOpen && (
        <Box {...COMPONENT_STYLES.AsyncSelect.dropdown}>
          {onSearch && (
            <Box p={2} borderBottom="1px solid" borderColor={COLORS.neutral[100]}>
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                {...COMPONENT_STYLES.AsyncSelect.searchInput}
                _focus={{
                  borderColor: 'blue.500',
                  boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
                }}
              />
            </Box>
          )}

          <Box>
            {isLoading ? (
              <Box {...COMPONENT_STYLES.AsyncSelect.loading}>
                <Spinner size="sm" />
                <Text fontSize="sm" color={COLORS.text.tertiary} mt={1}>
                  Loading...
                </Text>
              </Box>
            ) : isError ? (
              <Box {...COMPONENT_STYLES.AsyncSelect.error}>
                <Text fontSize="sm" color={COLORS.error[500]}>
                  {errorMessage}
                </Text>
              </Box>
            ) : filteredOptions.length === 0 ? (
              <Box {...COMPONENT_STYLES.AsyncSelect.empty}>
                <Text fontSize="sm" color={COLORS.text.tertiary}>
                  {noOptionsMessage}
                </Text>
              </Box>
            ) : (
              filteredOptions.map((option) => (
                <Box
                  key={option.value}
                  {...COMPONENT_STYLES.AsyncSelect.option.base}
                  {...(option.disabled
                    ? COMPONENT_STYLES.AsyncSelect.option.disabled
                    : {})}
                  onClick={() =>
                    !option.disabled && handleChange(String(option.value))
                  }
                >
                  <Text
                    {...COMPONENT_STYLES.AsyncSelect.option.text.base}
                    {...(option.disabled
                      ? COMPONENT_STYLES.AsyncSelect.option.text.disabled
                      : {})}
                  >
                    {option.label}
                  </Text>
                </Box>
              ))
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}
