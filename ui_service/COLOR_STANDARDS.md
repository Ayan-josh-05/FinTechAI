# Color Standards & Guidelines

This document outlines the color standards and guidelines for the UI Service project. All components should use the centralized color constants defined in `src/features/shared/constants/StyleConstants.ts` instead of hardcoded Chakra UI color values.

## 🎨 Color System Overview

Our color system is built on a foundation of semantic color tokens that provide consistency, accessibility, and maintainability across the entire application.

## 📋 Color Constants

### Primary Colors

```typescript
COLORS.primary[500] // #3b82f6 - Main brand color
COLORS.primary[600] // #2563eb - Active states, links
COLORS.primary[700] // #1d4ed8 - Hover states
```

### Neutral Colors

```typescript
COLORS.neutral[50] // #fafafa - Light backgrounds
COLORS.neutral[100] // #f5f5f5 - Subtle backgrounds
COLORS.neutral[200] // #e5e5e5 - Borders, dividers
COLORS.neutral[300] // #d4d4d4 - Disabled states
COLORS.neutral[400] // #a3a3a3 - Placeholder text
COLORS.neutral[500] // #737373 - Secondary text
COLORS.neutral[600] // #525252 - Body text
COLORS.neutral[700] // #404040 - Headings
COLORS.neutral[800] // #262626 - Dark text
COLORS.neutral[900] // #171717 - Primary text
```

### Text Colors (Semantic)

```typescript
COLORS.text.primary // #171717 - Main text content
COLORS.text.secondary // #525252 - Secondary text
COLORS.text.tertiary // #737373 - Helper text, labels
COLORS.text.disabled // #a3a3a3 - Disabled text
COLORS.text.inverse // #ffffff - Text on dark backgrounds
```

### Status Colors

```typescript
// Success
COLORS.success[500] // #22c55e - Success states
COLORS.success[600] // #16a34a - Success hover

// Warning
COLORS.warning[500] // #f59e0b - Warning states
COLORS.warning[600] // #d97706 - Warning hover

// Error
COLORS.error[500] // #ef4444 - Error states, required fields
COLORS.error[600] // #dc2626 - Error hover
```

### Background Colors

```typescript
COLORS.background.primary // #ffffff - Main background
COLORS.background.secondary // #f8fafc - Card backgrounds
COLORS.background.tertiary // #f1f5f9 - Subtle backgrounds
COLORS.background.dark // #0f172a - Dark mode backgrounds
```

## 🔄 Migration Guide

### Before (❌ Don't Use)

```tsx
// Hardcoded Chakra UI colors
<Text color="gray.700">Label</Text>
<Box bg="blue.500">Content</Box>
<Button borderColor="red.500">Action</Button>
```

### After (✅ Use This)

```tsx
// Global color constants
import { COLORS } from '@/features/shared/constants/StyleConstants'

<Text color={COLORS.neutral[700]}>Label</Text>
<Box bg={COLORS.primary[500]}>Content</Box>
<Button borderColor={COLORS.error[500]}>Action</Button>
```

## 📝 Color Usage Guidelines

### Text Colors

- **Primary Text**: Use `COLORS.text.primary` for main content
- **Secondary Text**: Use `COLORS.text.secondary` for supporting text
- **Tertiary Text**: Use `COLORS.text.tertiary` for labels and helper text
- **Disabled Text**: Use `COLORS.text.disabled` for inactive elements

### Background Colors

- **Main Background**: Use `COLORS.background.primary` for page backgrounds
- **Card Background**: Use `COLORS.background.secondary` for card containers
- **Subtle Background**: Use `COLORS.background.tertiary` for subtle sections

### Border Colors

- **Default Borders**: Use `COLORS.neutral[200]` for standard borders
- **Focus Borders**: Use `COLORS.primary[500]` for focused inputs
- **Error Borders**: Use `COLORS.error[500]` for validation errors

### Interactive States

- **Hover**: Use darker shades (e.g., `primary[600]` for `primary[500]` hover)
- **Active**: Use the base color (e.g., `primary[500]`)
- **Disabled**: Use `neutral[300]` for backgrounds, `text.disabled` for text

## 🎯 Component-Specific Guidelines

### Form Elements

```tsx
// Input labels
<Text color={COLORS.neutral[700]} fontSize="sm" fontWeight="medium">
  Field Label
</Text>

// Required field indicators
<Text as="span" color={COLORS.error[500]} ml={1}>
  *
</Text>

// Helper text
<Text color={COLORS.text.tertiary} fontSize="xs">
  Helper text
</Text>

// Error messages
<Text color={COLORS.error[500]} fontSize="xs">
  Error message
</Text>
```

### Navigation

```tsx
// Active tab
<Text color={COLORS.primary[600]}>
  Active Tab
</Text>

// Inactive tab
<Text color={COLORS.text.secondary}>
  Inactive Tab
</Text>

// Tab borders
<Box borderColor={COLORS.primary[600]}>
  Active Tab Border
</Box>
```

### Status Indicators

```tsx
// Success status
<Badge bg={COLORS.success[500]} color={COLORS.text.inverse}>
  Success
</Badge>

// Warning status
<Badge bg={COLORS.warning[500]} color={COLORS.text.inverse}>
  Warning
</Badge>

// Error status
<Badge bg={COLORS.error[500]} color={COLORS.text.inverse}>
  Error
</Badge>
```

## 🔍 Common Color Mappings

| Chakra UI Color | Global Constant         | Usage                   |
| --------------- | ----------------------- | ----------------------- |
| `gray.50`       | `COLORS.neutral[50]`    | Light backgrounds       |
| `gray.100`      | `COLORS.neutral[100]`   | Subtle backgrounds      |
| `gray.200`      | `COLORS.neutral[200]`   | Borders, dividers       |
| `gray.300`      | `COLORS.neutral[300]`   | Disabled states         |
| `gray.400`      | `COLORS.text.disabled`  | Disabled text           |
| `gray.500`      | `COLORS.text.tertiary`  | Helper text             |
| `gray.600`      | `COLORS.text.secondary` | Secondary text          |
| `gray.700`      | `COLORS.neutral[700]`   | Field labels            |
| `gray.800`      | `COLORS.neutral[800]`   | Dark text               |
| `gray.900`      | `COLORS.text.primary`   | Primary text            |
| `blue.500`      | `COLORS.primary[500]`   | Primary actions         |
| `blue.600`      | `COLORS.primary[600]`   | Active states           |
| `red.500`       | `COLORS.error[500]`     | Errors, required fields |
| `green.500`     | `COLORS.success[500]`   | Success states          |
| `yellow.500`    | `COLORS.warning[500]`   | Warning states          |

## 🚀 Implementation Steps

1. **Import Constants**: Add `import { COLORS } from '@/features/shared/constants/StyleConstants'`
2. **Replace Colors**: Replace hardcoded colors with appropriate constants
3. **Test Components**: Ensure visual consistency and accessibility
4. **Update Documentation**: Update component documentation with new color usage

## ✅ Benefits

- **Consistency**: Unified color palette across the application
- **Maintainability**: Single source of truth for colors
- **Accessibility**: Proper contrast ratios and semantic meaning
- **Scalability**: Easy to update colors globally
- **Type Safety**: TypeScript support for color constants

## 🔧 Tools & Automation

### ESLint Rules

Consider adding ESLint rules to prevent hardcoded colors:

```json
{
  "rules": {
    "no-hardcoded-colors": "error"
  }
}
```

### Search & Replace Patterns

Use these patterns to find and replace hardcoded colors:

```bash
# Find hardcoded colors
grep -r "color=\"gray\." src/
grep -r "bg=\"blue\." src/
grep -r "borderColor=\"red\." src/

# Replace with constants
sed -i 's/color="gray\.700"/color={COLORS.neutral[700]}/g' src/**/*.tsx
```

## 📚 References

- [Chakra UI Color System](https://chakra-ui.com/docs/styled-system/color-mode)
- [Design System Best Practices](https://designsystemsrepo.com/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Note**: This document should be updated whenever new colors are added to the design system or when color usage patterns change.
