import React, { forwardRef, useState } from 'react'
import { Box, Input as ChakraInput } from '@chakra-ui/react'
import {
  COMPONENT_STYLES,
  STYLES,
} from '@/features/shared/constants/StyleConstants'

export interface InputProps {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  isRequired?: boolean
  helperText?: string
  onChange?: (value: string) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  value?: string
  placeholder?: string
  type?: string
  disabled?: boolean
  className?: string
  name?: string
  id?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      isRequired = false,
      helperText,
      onChange,
      onBlur,
      value,
      placeholder,
      type = 'text',
      disabled = false,
      className = '',
      name,
      id,
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPasswordField = type === 'password'
    const inputType = isPasswordField && showPassword ? 'text' : type

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value)
    }

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    const passwordToggleIcon = isPasswordField ? (
      <button
        type="button"
        onClick={togglePasswordVisibility}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          padding: 0,
        }}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    ) : null

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

        <Box {...COMPONENT_STYLES.Input.group}>
          {leftIcon && (
            <Box {...COMPONENT_STYLES.Input.leftIcon}>{leftIcon}</Box>
          )}

          <ChakraInput
            ref={ref}
            type={inputType}
            value={value}
            onChange={handleChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            name={name}
            id={id}
            {...STYLES.form.input.base}
            {...(error ? STYLES.form.input.error : STYLES.form.input.focus)}
            {...(disabled ? STYLES.form.input.disabled : {})}
            bg="white"
            pl={leftIcon ? 10 : undefined}
            pr={rightIcon || passwordToggleIcon ? 10 : undefined}
          />

          {passwordToggleIcon && (
            <Box {...COMPONENT_STYLES.Input.rightIcon}>{passwordToggleIcon}</Box>
          )}

          {rightIcon && !isPasswordField && (
            <Box {...COMPONENT_STYLES.Input.rightIcon}>{rightIcon}</Box>
          )}
        </Box>

        {error && <Box {...STYLES.form.error.base}>{error}</Box>}

        {helperText && !error && (
          <Box {...STYLES.form.helper.base}>{helperText}</Box>
        )}
      </Box>
    )
  },
)

Input.displayName = 'Input'
