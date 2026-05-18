import React, { forwardRef } from 'react'
import { Box, Textarea as ChakraTextarea, Text } from '@chakra-ui/react'
import { STYLES } from '@/features/shared/constants/StyleConstants'

export interface TextAreaProps {
  label?: string
  error?: string
  isRequired?: boolean
  helperText?: string
  showCharacterCount?: boolean
  maxLength?: number
  onChange?: (value: string) => void
  value?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  name?: string
  id?: string
  rows?: number
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      error,
      isRequired = false,
      helperText,
      showCharacterCount = false,
      maxLength,
      onChange,
      value,
      placeholder,
      disabled = false,
      className = '',
      name,
      id,
      rows = 4,
    },
    ref,
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value)
    }

    const currentLength = typeof value === 'string' ? value.length : 0
    const isOverLimit = maxLength ? currentLength > maxLength : false

    return (
      <Box className={className}>
        {label && (
          <Box
            as="label"
            {...STYLES.form.label.base}
            {...(isRequired ? STYLES.form.label.required : {})}
          >
            {label}
          </Box>
        )}

        <ChakraTextarea
          ref={ref}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          name={name}
          id={id}
          rows={rows}
          {...STYLES.textarea.base}
          {...(error || isOverLimit
            ? STYLES.textarea.error
            : STYLES.textarea.focus)}
          {...(disabled ? STYLES.textarea.disabled : {})}
          bg="white"
        />

        {(error || isOverLimit) && (
          <Box {...STYLES.form.error.base}>
            {error ||
              `Character limit exceeded by ${currentLength - maxLength!} characters`}
          </Box>
        )}

        {helperText && !error && !isOverLimit && (
          <Box {...STYLES.form.helper.base}>{helperText}</Box>
        )}

        {showCharacterCount && maxLength && (
          <Box display="flex" justifyContent="flex-end" mt={1}>
            <Text fontSize="xs" color={isOverLimit ? 'red.500' : 'gray.500'}>
              {currentLength}/{maxLength}
            </Text>
          </Box>
        )}
      </Box>
    )
  },
)

TextArea.displayName = 'TextArea'
