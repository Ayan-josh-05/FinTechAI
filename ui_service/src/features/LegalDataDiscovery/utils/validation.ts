/**
 * Validation utilities for Legal Data Discovery feature
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validates PAN number format (ABCDE1234F)
 * - 5 letters (A-Z) followed by 4 digits (0-9) followed by 1 letter (A-Z)
 * - Automatically converts to uppercase
 */
export const validatePAN = (pan: string): ValidationResult => {
  if (!pan || !pan.trim()) {
    return { isValid: false, error: 'PAN number is required' }
  }

  // Remove spaces and convert to uppercase
  const cleanedPan = pan.replace(/\s/g, '').toUpperCase()

  // PAN format: 5 letters + 4 digits + 1 letter
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/

  if (!panRegex.test(cleanedPan)) {
    return {
      isValid: false,
      error: 'PAN number must be in format ABCDE1234F (5 letters, 4 digits, 1 letter)'
    }
  }

  return { isValid: true }
}

/**
 * Formats PAN number to uppercase and removes spaces
 */
export const formatPAN = (pan: string): string => {
  return pan.replace(/\s/g, '').toUpperCase()
}

/**
 * Validates Aadhaar number format
 * - Must be exactly 12 digits
 * - Can accept spaces or dashes for formatting
 */
export const validateAadhaar = (aadhaar: string): ValidationResult => {
  if (!aadhaar || !aadhaar.trim()) {
    return { isValid: false, error: 'Aadhaar number is required' }
  }

  // Remove spaces, dashes, and other non-digit characters
  const cleanedAadhaar = aadhaar.replace(/\D/g, '')

  // Must be exactly 12 digits
  if (cleanedAadhaar.length !== 12) {
    return {
      isValid: false,
      error: 'Aadhaar number must be exactly 12 digits'
    }
  }

  // Check if all digits are the same (invalid Aadhaar)
  if (/^(\d)\1{11}$/.test(cleanedAadhaar)) {
    return {
      isValid: false,
      error: 'Aadhaar number cannot have all identical digits'
    }
  }

  return { isValid: true }
}

/**
 * Formats Aadhaar number with spaces (1234 5678 9012)
 */
export const formatAadhaar = (aadhaar: string): string => {
  const cleaned = aadhaar.replace(/\D/g, '')
  if (cleaned.length === 12) {
    return cleaned.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')
  }
  return aadhaar
}

/**
 * Validates pincode format
 * - Must be exactly 6 digits (if provided)
 * - First digit cannot be 0
 */
export const validatePincode = (pincode: string): ValidationResult => {
  // If pincode is empty, it's valid (optional field)
  if (!pincode || !pincode.trim()) {
    return { isValid: true }
  }

  // Remove spaces and non-digit characters
  const cleanedPincode = pincode.replace(/\D/g, '')

  // Must be exactly 6 digits
  if (cleanedPincode.length !== 6) {
    return {
      isValid: false,
      error: 'Pincode must be exactly 6 digits'
    }
  }

  // First digit cannot be 0
  if (cleanedPincode.startsWith('0')) {
    return {
      isValid: false,
      error: 'Pincode cannot start with 0'
    }
  }

  return { isValid: true }
}

/**
 * Formats pincode to 6 digits
 */
export const formatPincode = (pincode: string): string => {
  return pincode.replace(/\D/g, '').slice(0, 6)
}

/**
 * Validates filing year
 * - Must be a valid year between 1900 and current year + 1
 * - Must be 4 digits
 */
export const validateFilingYear = (year: string): ValidationResult => {
  if (!year || !year.trim()) {
    return { isValid: false, error: 'Filing year is required' }
  }

  // Remove non-digit characters
  const cleanedYear = year.replace(/\D/g, '')

  // Must be exactly 4 digits
  if (cleanedYear.length !== 4) {
    return {
      isValid: false,
      error: 'Filing year must be 4 digits'
    }
  }

  const yearNum = parseInt(cleanedYear, 10)
  const currentYear = new Date().getFullYear()

  // Must be between 1900 and current year + 1
  if (yearNum < 1900 || yearNum > currentYear + 1) {
    return {
      isValid: false,
      error: `Filing year must be between 1900 and ${currentYear + 1}`
    }
  }

  return { isValid: true }
}

/**
 * Formats filing year to 4 digits
 */
export const formatFilingYear = (year: string): string => {
  return year.replace(/\D/g, '').slice(0, 4)
}

/**
 * Validates address field
 * - Must not be empty or contain only whitespace
 */
export const validateAddress = (address: string): ValidationResult => {
  if (!address || !address.trim()) {
    return { isValid: false, error: 'Address is required' }
  }

  if (address.trim().length < 3) {
    return {
      isValid: false,
      error: 'Address must be at least 3 characters long'
    }
  }

  return { isValid: true }
}

/**
 * Validates person name field
 * - Must not be empty or contain only whitespace
 * - Must contain only letters, spaces, dots, and apostrophes
 */
export const validatePersonName = (name: string): ValidationResult => {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Person name is required' }
  }

  if (name.trim().length < 2) {
    return {
      isValid: false,
      error: 'Person name must be at least 2 characters long'
    }
  }

  // Allow letters, spaces, dots, and apostrophes
  const nameRegex = /^[a-zA-Z\s.']+$/
  if (!nameRegex.test(name.trim())) {
    return {
      isValid: false,
      error: 'Person name can only contain letters, spaces, dots, and apostrophes'
    }
  }

  return { isValid: true }
}

/**
 * Validates judge name field
 * - Must not be empty or contain only whitespace
 * - Must contain only letters, spaces, dots, and apostrophes
 * - Similar to person name but with more flexible validation for titles like "Justice"
 */
export const validateJudgeName = (name: string): ValidationResult => {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Judge name is required' }
  }

  if (name.trim().length < 2) {
    return {
      isValid: false,
      error: 'Judge name must be at least 2 characters long'
    }
  }

  // Allow letters, spaces, dots, and apostrophes (more flexible for titles)
  const nameRegex = /^[a-zA-Z\s.']+$/
  if (!nameRegex.test(name.trim())) {
    return {
      isValid: false,
      error: 'Judge name can only contain letters, spaces, dots, and apostrophes'
    }
  }

  return { isValid: true }
}

/**
 * Validates a field based on its type and value
 */
export const validateField = (fieldType: string, value: string): ValidationResult => {
  switch (fieldType) {
    case 'panNumber':
      return validatePAN(value)
    case 'aadhaarNumber':
      return validateAadhaar(value)
    case 'pincode':
      return validatePincode(value)
    case 'filingYear':
      return validateFilingYear(value)
    case 'address':
      return validateAddress(value)
    case 'personName':
      return validatePersonName(value)
    case 'judgeName':
      return validateJudgeName(value)
    default:
      return { isValid: true }
  }
}

/**
 * Formats a field value based on its type
 */
export const formatField = (fieldType: string, value: string): string => {
  switch (fieldType) {
    case 'panNumber':
      return formatPAN(value)
    case 'aadhaarNumber':
      return formatAadhaar(value)
    case 'pincode':
      return formatPincode(value)
    case 'filingYear':
      return formatFilingYear(value)
    default:
      return value
  }
}

/**
 * Validates all form fields for a specific tab
 */
export const validateTabFields = (tabName: string, formData: Record<string, any>): Record<string, string> => {
  const errors: Record<string, string> = {}

  switch (tabName) {
    case 'PAN No.':
      if (formData.panNumber) {
        const panValidation = validatePAN(formData.panNumber)
        if (!panValidation.isValid) {
          errors.panNumber = panValidation.error || 'Invalid PAN number'
        }
      }
      break

    case 'Aadhaar No.':
      if (formData.aadhaarNumber) {
        const aadhaarValidation = validateAadhaar(formData.aadhaarNumber)
        if (!aadhaarValidation.isValid) {
          errors.aadhaarNumber = aadhaarValidation.error || 'Invalid Aadhaar number'
        }
      }
      break

    case 'Party Name and Address': {
      // Validate required person name field
      const personNameValidation = validatePersonName(formData.personName || '')
      if (!personNameValidation.isValid) {
        errors.personName = personNameValidation.error || 'Invalid person name'
      }
      break
    }

    case 'Section Wise': {
      // Validate required legal section field
      if (!formData.legalSection || formData.legalSection.trim() === '') {
        errors.legalSection = 'Legal section is required'
      }
      break
    }

    case 'Case No.':
      if (formData.caseNumber) {
        // Add case number validation if needed
        if (!formData.caseNumber.trim()) {
          errors.caseNumber = 'Case number is required'
        }
      }
      break

    case 'Advocate Name': {
      // Validate required advocate name field
      const advocateNameValidation = validatePersonName(formData.advocateName || '')
      if (!advocateNameValidation.isValid) {
        errors.advocateName = advocateNameValidation.error || 'Invalid advocate name'
      }
      break
    }

    case 'Judge Name':
      if (formData.judgeName) {
        const judgeNameValidation = validateJudgeName(formData.judgeName)
        if (!judgeNameValidation.isValid) {
          errors.judgeName = judgeNameValidation.error || 'Invalid judge name'
        }
      }
      break

    case 'Case Type':
      // No specific validation needed for case type selection
      break
  }

  return errors
}

