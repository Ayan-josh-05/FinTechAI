// Date format constants for consistent date handling across the application

/**
 * Standard date format for API calls - YYYY-MM-DD
 * This format is used for all date parameters sent to the backend
 */
export const API_DATE_FORMAT = 'YYYY-MM-DD'

/**
 * Date format for display purposes - MM/DD/YYYY
 * This format is used for displaying dates in the UI
 */
export const DISPLAY_DATE_FORMAT = 'MM/DD/YYYY'

/**
 * Date format for display purposes (European) - DD/MM/YYYY
 * This format is used for displaying dates in DD/MM/YYYY format
 */
export const DISPLAY_DATE_FORMAT_DMY = 'DD/MM/YYYY'

/**
 * Date format for input fields - YYYY-MM-DD
 * This format is used for date input fields (HTML date input format)
 */
export const INPUT_DATE_FORMAT = 'YYYY-MM-DD'

/**
 * Date format for timestamps - YYYY-MM-DDTHH:mm:ss.sssZ
 * This format is used for full timestamp values
 */
export const TIMESTAMP_FORMAT = 'YYYY-MM-DDTHH:mm:ss.sssZ'

/**
 * Date format for time only - HH:mm:ss
 * This format is used for time-only values
 */
export const TIME_FORMAT = 'HH:mm:ss'

/**
 * Date format for date and time - YYYY-MM-DD HH:mm:ss
 * This format is used for date and time combinations
 */
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

/**
 * Date format for month and year - YYYY-MM
 * This format is used for month/year selections
 */
export const MONTH_YEAR_FORMAT = 'YYYY-MM'

/**
 * Date format for year only - YYYY
 * This format is used for year-only selections
 */
export const YEAR_FORMAT = 'YYYY'

/**
 * Date format for relative dates - e.g., "2 days ago", "1 week ago"
 * This format is used for relative date displays
 */
export const RELATIVE_DATE_FORMAT = 'relative'

/**
 * Date format constants object for easy access
 */
export const DATE_FORMATS = {
  API: API_DATE_FORMAT,
  DISPLAY: DISPLAY_DATE_FORMAT,
  DISPLAY_DMY: DISPLAY_DATE_FORMAT_DMY,
  INPUT: INPUT_DATE_FORMAT,
  TIMESTAMP: TIMESTAMP_FORMAT,
  TIME: TIME_FORMAT,
  DATETIME: DATETIME_FORMAT,
  MONTH_YEAR: MONTH_YEAR_FORMAT,
  YEAR: YEAR_FORMAT,
  RELATIVE: RELATIVE_DATE_FORMAT,
} as const

/**
 * Type for date format constants
 */
export type DateFormat = typeof DATE_FORMATS[keyof typeof DATE_FORMATS]
