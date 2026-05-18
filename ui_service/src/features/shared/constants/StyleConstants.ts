// Common styling constants using Chakra UI props

// ============================================================================
// COLOR THEME CONSTANTS
// ============================================================================
export const COLORS = {
  // Primary Brand Colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main primary color
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Secondary Colors
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b', // Main secondary color
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Success Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main success color
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warning Colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Main warning color
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error/Danger Colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main error color
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Neutral Colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    dark: '#0f172a',
  },

  // Text Colors
  text: {
    primary: '#171717',
    secondary: '#525252',
    tertiary: '#737373',
    disabled: '#a3a3a3',
    inverse: '#ffffff',
  },
} as const

// ============================================================================
// TYPOGRAPHY CONSTANTS
// ============================================================================
export const TYPOGRAPHY = {
  // Heading Styles
  h1: {
    fontSize: { base: '2xl', md: '3xl', lg: '4xl' },
    fontWeight: 'bold',
    lineHeight: 'tight',
    color: COLORS.text.primary,
    letterSpacing: 'tight',
  },

  h2: {
    fontSize: { base: 'xl', md: '2xl', lg: '3xl' },
    fontWeight: 'semibold',
    lineHeight: 'tight',
    color: COLORS.text.primary,
    letterSpacing: 'tight',
  },

  h3: {
    fontSize: { base: 'lg', md: 'xl', lg: '2xl' },
    fontWeight: 'semibold',
    lineHeight: 'tight',
    color: COLORS.text.primary,
    letterSpacing: 'tight',
  },

  h4: {
    fontSize: { base: 'md', md: 'lg', lg: 'xl' },
    fontWeight: 'medium',
    lineHeight: 'tight',
    color: COLORS.text.primary,
    letterSpacing: 'tight',
  },

  // Sub-heading Styles
  subheading: {
    fontSize: { base: 'sm', md: 'md' },
    fontWeight: 'medium',
    lineHeight: 'normal',
    color: COLORS.text.secondary,
    letterSpacing: 'normal',
  },

  // Body Text Styles
  body: {
    large: {
      fontSize: 'lg',
      fontWeight: 'normal',
      lineHeight: 'relaxed',
      color: COLORS.text.primary,
      letterSpacing: 'normal',
    },
    medium: {
      fontSize: 'md',
      fontWeight: 'normal',
      lineHeight: 'relaxed',
      color: COLORS.text.primary,
      letterSpacing: 'normal',
    },
    small: {
      fontSize: 'sm',
      fontWeight: 'normal',
      lineHeight: 'relaxed',
      color: COLORS.text.secondary,
      letterSpacing: 'normal',
    },
  },

  // Caption Styles
  caption: {
    fontSize: 'xs',
    fontWeight: 'normal',
    lineHeight: 'normal',
    color: COLORS.text.tertiary,
    letterSpacing: 'wide',
  },

  // Label Styles
  label: {
    fontSize: 'sm',
    fontWeight: 'medium',
    lineHeight: 'normal',
    color: COLORS.text.secondary,
    letterSpacing: 'normal',
  },

  // Button Text Styles
  button: {
    large: {
      fontSize: 'md',
      fontWeight: 'medium',
      lineHeight: 'normal',
      letterSpacing: 'normal',
    },
    medium: {
      fontSize: 'sm',
      fontWeight: 'medium',
      lineHeight: 'normal',
      letterSpacing: 'normal',
    },
    small: {
      fontSize: 'xs',
      fontWeight: 'medium',
      lineHeight: 'normal',
      letterSpacing: 'normal',
    },
  },
} as const

// ============================================================================
// ENHANCED STYLES OBJECT
// ============================================================================
export const STYLES = {
  // Layout
  container: { w: 'full' },
  flexCenter: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  flexBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  flexStart: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start' },
  flexEnd: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end' },

  // Spacing
  spacing: {
    xs: { p: 1 },
    sm: { p: 2 },
    md: { p: 3 },
    lg: { p: 4 },
    xl: { p: 6 },
  },

  // Typography - Updated to use new constants
  text: {
    h1: TYPOGRAPHY.h1,
    h2: TYPOGRAPHY.h2,
    h3: TYPOGRAPHY.h3,
    h4: TYPOGRAPHY.h4,
    subheading: TYPOGRAPHY.subheading,
    body: {
      large: TYPOGRAPHY.body.large,
      medium: TYPOGRAPHY.body.medium,
      small: TYPOGRAPHY.body.small,
    },
    caption: TYPOGRAPHY.caption,
    label: TYPOGRAPHY.label,
    button: TYPOGRAPHY.button,
  },

  font: {
    normal: { fontWeight: 'normal' },
    medium: { fontWeight: 'medium' },
    semibold: { fontWeight: 'semibold' },
    bold: { fontWeight: 'bold' },
  },

  // Colors - Updated to use new constants
  colors: {
    primary: {
      bg: COLORS.primary[500],
      text: COLORS.primary[500],
      border: COLORS.primary[500],
      hover: { bg: COLORS.primary[600] },
      focus: { ringColor: COLORS.primary[500] },
      disabled: { bg: COLORS.primary[300], color: COLORS.primary[100] },
    },
    secondary: {
      bg: COLORS.secondary[100],
      text: COLORS.secondary[700],
      border: COLORS.secondary[300],
      hover: { bg: COLORS.secondary[200] },
      focus: { ringColor: COLORS.secondary[500] },
      disabled: { bg: COLORS.secondary[50], color: COLORS.secondary[400] },
    },
    success: {
      bg: COLORS.success[500],
      text: COLORS.success[500],
      border: COLORS.success[500],
      hover: { bg: COLORS.success[600] },
      focus: { ringColor: COLORS.success[500] },
      disabled: { bg: COLORS.success[300], color: COLORS.success[100] },
    },
    warning: {
      bg: COLORS.warning[500],
      text: COLORS.warning[500],
      border: COLORS.warning[500],
      hover: { bg: COLORS.warning[600] },
      focus: { ringColor: COLORS.warning[500] },
      disabled: { bg: COLORS.warning[300], color: COLORS.warning[100] },
    },
    error: {
      bg: COLORS.error[500],
      text: COLORS.error[500],
      border: COLORS.error[500],
      hover: { bg: COLORS.error[600] },
      focus: { ringColor: COLORS.error[500] },
      disabled: { bg: COLORS.error[300], color: COLORS.error[100] },
    },
    neutral: {
      bg: COLORS.neutral[50],
      text: COLORS.neutral[500],
      border: COLORS.neutral[200],
      hover: { bg: COLORS.neutral[100] },
      focus: { ringColor: COLORS.neutral[500] },
      disabled: { bg: COLORS.neutral[100], color: COLORS.neutral[400] },
    },
  },

  // Borders
  border: {
    none: { border: 'none' },
    sm: { border: '1px solid' },
    md: { border: '2px solid' },
    lg: { border: '4px solid' },
    radius: {
      none: { borderRadius: 'none' },
      sm: { borderRadius: 'sm' },
      md: { borderRadius: 'md' },
      lg: { borderRadius: 'lg' },
      xl: { borderRadius: 'xl' },
      full: { borderRadius: 'full' },
    },
  },

  // Shadows
  shadow: {
    none: { boxShadow: 'none' },
    sm: { boxShadow: 'sm' },
    md: { boxShadow: 'md' },
    lg: { boxShadow: 'lg' },
    xl: { boxShadow: 'xl' },
  },

  // Transitions
  transition: {
    all: { transition: 'all 0.2s ease-in-out' },
    colors: { transition: 'colors 0.2s ease-in-out' },
    transform: { transition: 'transform 0.2s ease-in-out' },
  },

  // Focus states
  focus: {
    ring: {
      _focus: {
        outline: 'none',
        ring: 2,
        ringOffset: 2
      }
    },
    ringPrimary: {
      _focus: {
        outline: 'none',
        ring: 2,
        ringColor: COLORS.primary[500],
        ringOffset: 2
      }
    },
    ringError: {
      _focus: {
        outline: 'none',
        ring: 2,
        ringColor: COLORS.error[500],
        ringOffset: 2
      }
    },
  },

  // Form elements
  form: {
    input: {
      base: {
        w: 'full',
        px: 3,
        py: 2,
        border: '1px solid',
        borderColor: COLORS.neutral[300],
        borderRadius: 'md',
        fontSize: 'sm',
        color: COLORS.text.primary,
        bg: COLORS.background.primary,
      },
      focus: {
        _focus: {
          outline: 'none',
          ring: 2,
          ringColor: COLORS.primary[500],
          borderColor: COLORS.primary[500]
        }
      },
      error: {
        borderColor: COLORS.error[500],
        _focus: {
          ringColor: COLORS.error[500],
          borderColor: COLORS.error[500]
        }
      },
      disabled: {
        bg: COLORS.neutral[50],
        color: COLORS.neutral[800],
        fontWeight: 'bold',
        cursor: 'not-allowed'
      },
    },
    label: {
      base: {
        display: 'block',
        fontSize: 'sm',
        fontWeight: 'medium',
        color: COLORS.text.secondary,
        mb: 2
      },
      required: {
        _after: {
          content: '"*"',
          ml: 0.5,
          color: COLORS.error[500]
        }
      },
    },
    error: {
      base: { fontSize: 'xs', color: COLORS.error[500], mt: 1 },
    },
    helper: {
      base: { fontSize: 'xs', color: COLORS.text.tertiary, mt: 1 },
    },
  },

  // Button variants - Updated to use new color constants
  button: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 4,
      py: 2,
      fontSize: 'sm',
      fontWeight: 'medium',
      borderRadius: 'md',
      transition: 'all 0.2s ease-in-out',
      _focus: {
        outline: 'none',
        ring: 2,
        ringOffset: 2
      }
    },
    primary: {
      bg: COLORS.primary[500],
      color: COLORS.text.inverse,
      _hover: { bg: COLORS.primary[600] },
      _focus: { ringColor: COLORS.primary[500] },
      _disabled: { bg: COLORS.neutral[300], color: COLORS.neutral[500] }
    },
    secondary: {
      bg: COLORS.secondary[100],
      color: COLORS.secondary[700],
      _hover: { bg: COLORS.secondary[200] },
      _focus: { ringColor: COLORS.secondary[500] },
      _disabled: { bg: COLORS.secondary[50], color: COLORS.secondary[400] }
    },
    outline: {
      bg: 'transparent',
      color: COLORS.primary[500],
      border: '1px solid',
      borderColor: COLORS.primary[500],
      _hover: { bg: COLORS.primary[50] },
      _focus: { ringColor: COLORS.primary[500] },
      _disabled: { borderColor: COLORS.neutral[300], color: COLORS.neutral[400] }
    },
    ghost: {
      bg: 'transparent',
      color: COLORS.text.primary,
      _hover: { bg: COLORS.neutral[100] },
      _focus: { ringColor: COLORS.neutral[500] },
      _disabled: { color: COLORS.text.disabled }
    },
    danger: {
      bg: COLORS.error[500],
      color: COLORS.text.inverse,
      _hover: { bg: COLORS.error[600] },
      _focus: { ringColor: COLORS.error[500] },
      _disabled: { bg: COLORS.neutral[300], color: COLORS.neutral[500] }
    },
  },

  // Select styles
  select: {
    base: {
      w: 'full',
      px: 3,
      py: 2,
      border: '1px solid',
      borderColor: COLORS.neutral[300],
      borderRadius: 'md',
      fontSize: 'sm',
      bg: COLORS.background.primary,
      color: COLORS.text.primary,
    },
    focus: {
      _focus: {
        outline: 'none',
        ring: 2,
        ringColor: COLORS.primary[500],
        borderColor: COLORS.primary[500]
      }
    },
    error: {
      borderColor: COLORS.error[500],
      _focus: {
        ringColor: COLORS.error[500],
        borderColor: COLORS.error[500]
      }
    },
    disabled: {
      bg: COLORS.neutral[50],
      color: COLORS.text.disabled,
      cursor: 'not-allowed'
    },
  },

  // Textarea styles
  textarea: {
    base: {
      w: 'full',
      px: 3,
      py: 2,
      border: '1px solid',
      borderColor: COLORS.neutral[300],
      borderRadius: 'md',
      fontSize: 'sm',
      resize: 'vertical',
      minH: '100px',
      color: COLORS.text.primary,
      bg: COLORS.background.primary,
    },
    focus: {
      _focus: {
        outline: 'none',
        ring: 2,
        ringColor: COLORS.primary[500],
        borderColor: COLORS.primary[500]
      }
    },
    error: {
      borderColor: COLORS.error[500],
      _focus: {
        ringColor: COLORS.error[500],
        borderColor: COLORS.error[500]
      }
    },
    disabled: {
      bg: COLORS.neutral[50],
      color: COLORS.text.disabled,
      cursor: 'not-allowed'
    },
  },

  // Wizard styles
  wizard: {
    progress: {
      container: { w: 'full', bg: COLORS.neutral[200], borderRadius: 'full', h: 2 },
      bar: { bg: COLORS.primary[500], h: 2, borderRadius: 'full', transition: 'all 0.3s' },
    },
    step: {
      container: {
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s'
      },
      circle: {
        base: {
          w: 10,
          h: 10,
          borderRadius: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.text.inverse,
          fontWeight: 'bold',
          fontSize: 'sm',
          transition: 'all 0.2s'
        },
        active: { bg: COLORS.primary[500] },
        completed: { bg: COLORS.success[500] },
        inactive: { bg: COLORS.neutral[200], color: COLORS.neutral[600] },
      },
      text: {
        base: { ml: 3, minW: '120px' },
        title: {
          base: { fontSize: 'sm', fontWeight: 'medium', color: COLORS.neutral[600] },
          active: { fontWeight: 'bold', color: COLORS.primary[600] },
        },
        description: { fontSize: 'xs', color: COLORS.text.tertiary, mt: 1 },
      },
    },
  },
} as const

// Navigation constants
export interface NavItem {
  label: string
  path: string
  disabled?: boolean
}

export const NAVIGATION_ITEMS: Array<NavItem> = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Legal Discovery', path: '/legal-data-discovery' },
  { label: 'Query Management', path: '/query-management' },
  { label: 'Search', path: '/semantic-search' },
]

// Navigation styles
export const NAVIGATION_STYLES = {
  header: {
    container: {
      bg: COLORS.background.primary,
      px: 8,
      py: 3,
    },
    layout: {
      align: 'center',
      justify: 'space-between',
      w: '100%',
    },
  },
  logo: {
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    icon: {
      w: 8,
      h: 8,
      bg: COLORS.neutral[300],
      borderRadius: 'full',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontSize: '2xl',
      fontWeight: 'semibold',
      color: COLORS.text.primary,
      ml: 3,
    },
  },
  nav: {
    container: {
      justify: 'center',
      flex: 1,
    },
    itemsWrapper: {
      gap: 8,
    },
    item: {
      base: {
        as: 'button',
        px: 3,
        py: 2,
        borderRadius: 'md',
        fontSize: 'sm',
        fontWeight: 'medium',
        transition: 'all 0.2s',
      },
      active: {
        color: COLORS.primary[600],
        bg: COLORS.primary[50],
        _hover: {
          bg: COLORS.primary[100],
          color: COLORS.primary[700],
        },
      },
      inactive: {
        color: COLORS.text.primary,
        bg: 'transparent',
        _hover: {
          bg: COLORS.neutral[50],
          color: COLORS.text.primary,
        },
      },
      disabled: {
        color: COLORS.text.disabled,
        bg: 'transparent',
        cursor: 'not-allowed',
        _hover: {},
      },
    },
  },
  user: {
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 3,
    },
    wrapper: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 2,
      cursor: 'pointer',
    },
    avatar: {
      w: 8,
      h: 8,
      bg: COLORS.neutral[300],
      borderRadius: 'full',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: {
      color: COLORS.text.primary,
      fontWeight: 'medium',
      cursor: 'pointer',
    },
    icon: {
      w: 4,
      h: 4,
      color: COLORS.text.tertiary,
    },
  },
} as const

// Component-specific constants
export const COMPONENT_STYLES = {
  AsyncSelect: {
    container: { position: 'relative' },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 50,
      bg: COLORS.background.primary,
      border: '1px solid',
      borderColor: COLORS.neutral[200],
      borderRadius: 'md',
      boxShadow: 'lg',
      maxH: '200px',
      overflowY: 'auto'
    },
    searchInput: {
      w: 'full',
      px: 3,
      py: 2,
      border: '1px solid',
      borderColor: COLORS.neutral[200],
      borderRadius: 'md',
      fontSize: 'sm',
      color: COLORS.text.primary,
      bg: COLORS.background.primary,
    },
    option: {
      base: {
        p: 2,
        cursor: 'pointer',
        _hover: { bg: COLORS.primary[50] },
        transition: 'colors 0.15s'
      },
      disabled: {
        bg: COLORS.neutral[50],
        cursor: 'not-allowed',
        _hover: { bg: COLORS.neutral[50] }
      },
      text: {
        base: { fontSize: 'sm', color: COLORS.text.primary },
        disabled: { color: COLORS.text.disabled },
      },
    },
    loading: {
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2
    },
    error: {
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: COLORS.error[500]
    },
    empty: {
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: COLORS.text.tertiary
    },
  },

  Input: {
    group: { position: 'relative' },
    leftIcon: {
      position: 'absolute',
      left: 3,
      top: '50%',
      transform: 'translateY(-50%)',
      color: COLORS.text.tertiary
    },
    rightIcon: {
      position: 'absolute',
      right: 3,
      top: '50%',
      transform: 'translateY(-50%)',
      color: COLORS.text.tertiary
    },
  },

  Button: {
    loading: { animation: 'spin' },
    icon: { w: 3, h: 4 },
  },

  Wizard: {
    container: { spaceY: 6 },
    steps: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      spaceX: 4,
      flexWrap: 'wrap'
    },
    content: { minH: '300px' },
    navigation: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      mt: 8
    },
  },
} as const
