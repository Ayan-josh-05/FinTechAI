import { ToastNotifications } from '@/features/shared/components/ToastNotifications'

export interface ValidationResult {
  isValid: boolean
  errors: Array<string>
}

/**
 * Validates email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates password strength
 */
export const validatePassword = (password: string): ValidationResult => {
  const errors: Array<string> = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one digit')
  }

  if (!/[@#$%^&+=]/.test(password)) {
    errors.push('Password must contain at least one special character (@#$%^&+=)')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates phone number format (expects +91 prefix)
 */
export const validatePhone = (phone: string): boolean => {
  // Phone validation for Indian numbers with +91 prefix
  // Should be exactly 10 digits after +91
  const phoneRegex = /^\+91[0-9]{10}$/
  return phoneRegex.test(phone)
}

/**
 * Validates city name format (no numbers allowed)
 */
export const validateCity = (city: string): boolean => {
  // City validation - only letters, spaces, hyphens, apostrophes, and periods
  const cityRegex = /^[a-zA-Z\s\-'\.]+$/
  return cityRegex.test(city) && city.trim().length > 0
}

/**
 * Validates registration form data
 */
export const validateRegistrationForm = (data: {
  email: string
  password: string
  full_name: string
  phone: string
  city: string
  profile: {
    profile_type: string
    fields: {
      [key: string]: any
    }
  }
}): ValidationResult => {
  const errors: Array<string> = []

  // Check required fields
  if (!data.email.trim()) {
    errors.push('Email is required')
  } else if (!validateEmail(data.email)) {
    errors.push('Please enter a valid email address')
  }

  if (!data.password) {
    errors.push('Password is required')
  } else {
    const passwordValidation = validatePassword(data.password)
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors)
    }
  }

  if (!data.full_name.trim()) {
    errors.push('Full name is required')
  }

  if (!data.phone.trim()) {
    errors.push('Phone number is required')
  } else if (!validatePhone(data.phone)) {
    errors.push('Please enter a valid 10-digit phone number')
  }

  if (!data.city.trim()) {
    errors.push('City is required')
  } else if (!validateCity(data.city)) {
    errors.push('City name should only contain letters, spaces, hyphens, apostrophes, and periods')
  }

  if (!data.profile.profile_type) {
    errors.push('Profile type is required')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Shows validation errors as toast notifications
 */
export const showValidationErrors = (errors: Array<string>): void => {
  if (errors.length === 1) {
    ToastNotifications.validationError(errors[0])
  } else if (errors.length > 1) {
    ToastNotifications.validationError(`Multiple errors: ${errors.join(', ')}`)
  }
}

/**
 * Validates sign in form data
 */
export const validateSignInForm = (data: {
  email: string
  password: string
}): ValidationResult => {
  const errors: Array<string> = []

  if (!data.email.trim()) {
    errors.push('Email is required')
  } else if (!validateEmail(data.email)) {
    errors.push('Please enter a valid email address')
  }

  if (!data.password) {
    errors.push('Password is required')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
