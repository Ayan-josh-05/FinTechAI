import React, { forwardRef } from 'react'
import { Box } from '@chakra-ui/react'
import ReactDatePicker from 'react-datepicker'
import { FiCalendar } from 'react-icons/fi'
import {
  COLORS,
  COMPONENT_STYLES,
  STYLES,
} from '@/features/shared/constants/StyleConstants'
import 'react-datepicker/dist/react-datepicker.css'

export interface DatePickerProps {
  label?: string
  error?: string
  isRequired?: boolean
  helperText?: string
  onChange?: (date: Date | null) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  value?: Date | null
  placeholder?: string
  disabled?: boolean
  className?: string
  name?: string
  id?: string
  minDate?: Date
  maxDate?: Date
  dateFormat?: string
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      label,
      error,
      isRequired = false,
      helperText,
      onChange,
      onBlur,
      value,
      placeholder = 'DD/MM/YYYY',
      disabled = false,
      className = '',
      name,
      id,
      minDate,
      maxDate,
      dateFormat = 'dd/MM/yyyy',
    },
    ref,
  ) => {
    const handleChange = (date: Date | null) => {
      onChange?.(date)
    }

    const CustomInput = forwardRef<HTMLInputElement, any>(
      (
        { value: inputValue, onClick, onBlur: inputOnBlur, ...inputProps },
        inputRef,
      ) => (
        <Box {...COMPONENT_STYLES.Input.group}>
          <input
            ref={inputRef}
            value={inputValue}
            onClick={onClick}
            onBlur={(e) => {
              inputOnBlur?.(e)
              onBlur?.(e)
            }}
            placeholder={placeholder}
            disabled={disabled}
            name={name}
            id={id}
            readOnly
            style={{
              cursor: 'pointer',
              backgroundColor: 'white',
              height: '30px',
              border: '1px solid rgb(212, 212, 212)',
              borderRadius: '6px',
              color: 'rgb(23, 23, 23)',
              padding: '0.5rem',
              width: '100%',
              fontSize: '14px',
              ...(error ? STYLES.form.input.error : STYLES.form.input.focus),
              ...(disabled ? STYLES.form.input.disabled : {}),
            }}
            {...inputProps}
          />
          <Box
            {...COMPONENT_STYLES.Input.rightIcon}
            pointerEvents="none"
            color={COLORS.neutral[400]}
          >
            <FiCalendar size={16} />
          </Box>
        </Box>
      ),
    )

    CustomInput.displayName = 'CustomInput'

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

        <ReactDatePicker
          selected={value}
          onChange={handleChange}
          customInput={<CustomInput ref={ref} />}
          dateFormat={dateFormat}
          placeholderText={placeholder}
          disabled={disabled}
          minDate={minDate}
          maxDate={maxDate}
          showPopperArrow={false}
          popperClassName="react-datepicker-popper"
          calendarClassName="react-datepicker-calendar"
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          scrollableYearDropdown
          yearDropdownItemNumber={100}
        />

        {error && <Box {...STYLES.form.error.base}>{error}</Box>}

        {helperText && !error && (
          <Box {...STYLES.form.helper.base}>{helperText}</Box>
        )}
      </Box>
    )
  },
)

DatePicker.displayName = 'DatePicker'
