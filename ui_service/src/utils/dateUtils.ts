// Note: API_DATE_FORMAT is available from DateConstants if needed for future use

/**
 * Formats a date string or Date object to DD/MM/YYYY format for display
 * @param date - The date to format (Date object, ISO string, or date string)
 * @returns Formatted date string in DD/MM/YYYY format, or the original string if it's 'N/A', or empty string if date is null/undefined/invalid
 */
export const formatDateForDisplay = (date: Date | string | null | undefined): string => {
  if (!date) {
    return ''
  }

  // Handle 'N/A' string values - return them as-is
  if (typeof date === 'string' && date.toUpperCase() === 'N/A') {
    return date
  }

  try {
    // Ensure we have a valid Date object
    const dateObj = typeof date === 'string' ? new Date(date) : date

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return ''
    }

    // Format to DD/MM/YYYY
    const day = String(dateObj.getDate()).padStart(2, '0')
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const year = dateObj.getFullYear()

    return `${day}/${month}/${year}`
  } catch (error) {
    console.warn('Error formatting date for display:', date, error)
    return ''
  }
}

/**
 * Formats a Date object to YYYY-MM-DD format for API calls
 * @param date - The date to format
 * @returns Formatted date string in YYYY-MM-DD format, or empty string if date is null/undefined
 */
export const formatDateForAPI = (date: Date | null | undefined): string => {
  console.log('formatDateForAPI: Input date:', date)
  if (!date) {
    console.log('formatDateForAPI: No date provided, returning empty string')
    return ''
  }

  // Ensure we have a valid Date object
  const dateObj = new Date(date)

  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    console.log('formatDateForAPI: Invalid date, returning empty string')
    return ''
  }

  // Format to YYYY-MM-DD
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')

  const result = `${year}-${month}-${day}`
  console.log('formatDateForAPI: Formatted result:', result)
  return result
}

/**
 * Formats a date string to YYYY-MM-DD format for API calls
 * @param dateString - The date string to format
 * @returns Formatted date string in YYYY-MM-DD format, or empty string if invalid
 */
export const formatDateStringForAPI = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return ''
  }

  try {
    const date = new Date(dateString)
    return formatDateForAPI(date)
  } catch (error) {
    console.warn('Invalid date string provided to formatDateStringForAPI:', dateString)
    return ''
  }
}

/**
 * Parses a date string (YYYY-MM-DD or ISO format) back to a Date object
 * @param dateString - The date string in YYYY-MM-DD or ISO format
 * @returns Date object or null if invalid
 */
export const parseAPIDateString = (dateString: string | null | undefined): Date | null => {
  if (!dateString) {
    return null
  }

  try {
    let date: Date

    // Check if it's already in ISO format (contains 'T' or 'Z')
    if (dateString.includes('T') || dateString.includes('Z')) {
      // Parse as ISO string directly
      date = new Date(dateString)
    } else {
      // Validate the format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(dateString)) {
        console.warn('Invalid date format provided to parseAPIDateString:', dateString)
        return null
      }
      // Convert YYYY-MM-DD to ISO format
      date = new Date(dateString + 'T00:00:00.000Z')
    }

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date value provided to parseAPIDateString:', dateString)
      return null
    }

    return date
  } catch (error) {
    console.warn('Error parsing date string:', dateString, error)
    return null
  }
}

/**
 * Validates if a date string is in YYYY-MM-DD format
 * @param dateString - The date string to validate
 * @returns True if the string is in valid YYYY-MM-DD format
 */
export const isValidAPIDateFormat = (dateString: string): boolean => {
  if (!dateString) {
    return false
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) {
    return false
  }

  const date = new Date(dateString + 'T00:00:00.000Z')
  return !isNaN(date.getTime())
}
