# Theming and Typography System

This document outlines the centralized theming and typography system implemented in the project.

## Color System

### Color Constants (`COLORS`)

All colors are defined as constants in `StyleConstants.ts` to ensure consistency across the application:

```typescript
export const COLORS = {
  primary: { 50: '#eff6ff', 100: '#dbeafe', ..., 900: '#1e3a8a' },
  secondary: { 50: '#f8fafc', 100: '#f1f5f9', ..., 900: '#0f172a' },
  success: { 50: '#f0fdf4', 100: '#dcfce7', ..., 900: '#14532d' },
  warning: { 50: '#fffbeb', 100: '#fef3c7', ..., 900: '#78350f' },
  error: { 50: '#fef2f2', 100: '#fee2e2', ..., 900: '#7f1d1d' },
  neutral: { 50: '#fafafa', 100: '#f5f5f5', ..., 900: '#171717' },
  background: { primary: '#ffffff', secondary: '#f8fafc', tertiary: '#f1f5f9', dark: '#0f172a' },
  text: { primary: '#171717', secondary: '#525252', tertiary: '#737373', disabled: '#a3a3a3', inverse: '#ffffff' },
}
```

### Usage

Instead of hardcoding colors, use the constants:

```typescript
// ❌ Don't do this
color="blue.500"
bg="gray.100"

// ✅ Do this
color={COLORS.primary[500]}
bg={COLORS.neutral[100]}
```

## Typography System

### Typography Constants (`TYPOGRAPHY`)

Standardized typography styles are defined for consistent text rendering:

```typescript
export const TYPOGRAPHY = {
  h1: { fontSize: { base: '2xl', md: '3xl', lg: '4xl' }, fontWeight: 'bold', ... },
  h2: { fontSize: { base: 'xl', md: '2xl', lg: '3xl' }, fontWeight: 'semibold', ... },
  h3: { fontSize: { base: 'lg', md: 'xl', lg: '2xl' }, fontWeight: 'semibold', ... },
  h4: { fontSize: { base: 'md', md: 'lg', lg: 'xl' }, fontWeight: 'medium', ... },
  subheading: { fontSize: { base: 'sm', md: 'md' }, fontWeight: 'medium', ... },
  body: {
    large: { fontSize: 'lg', fontWeight: 'normal', ... },
    medium: { fontSize: 'md', fontWeight: 'normal', ... },
    small: { fontSize: 'sm', fontWeight: 'normal', ... },
  },
  caption: { fontSize: 'xs', fontWeight: 'normal', ... },
  label: { fontSize: 'sm', fontWeight: 'medium', ... },
  button: {
    large: { fontSize: 'md', fontWeight: 'medium', ... },
    medium: { fontSize: 'sm', fontWeight: 'medium', ... },
    small: { fontSize: 'xs', fontWeight: 'medium', ... },
  },
}
```

### Typography Components

Use the Typography components for consistent text styling:

```typescript
import { H1, H2, H3, H4, Subheading, BodyLarge, BodyMedium, BodySmall, Caption, Label } from '@/features/shared/components'

// Usage
<H1>Main Heading</H1>
<H2>Section Heading</H2>
<H3>Subsection Heading</H3>
<H4>Minor Heading</H4>
<Subheading>Subheading text</Subheading>
<BodyLarge>Large body text</BodyLarge>
<BodyMedium>Medium body text</BodyMedium>
<BodySmall>Small body text</BodySmall>
<Caption>Caption text</Caption>
<Label>Label text</Label>
```

### Generic Typography Component

For custom variants, use the generic Typography component:

```typescript
import { Typography } from '@/features/shared/components'

<Typography variant="h1">Custom heading</Typography>
<Typography variant="body-medium">Custom body text</Typography>
```

## Text Categories

The typography system is organized into the following categories:

### Headings (H1, H2, H3, H4)

- **H1**: Main page titles (2xl-4xl, bold)
- **H2**: Section headings (xl-3xl, semibold)
- **H3**: Subsection headings (lg-2xl, semibold)
- **H4**: Minor headings (md-xl, medium)

### Subheadings

- **Subheading**: Descriptive text below headings (sm-md, medium)

### Body Text

- **BodyLarge**: Large body text (lg, normal)
- **BodyMedium**: Standard body text (md, normal)
- **BodySmall**: Small body text (sm, normal, secondary color)

### Supporting Text

- **Caption**: Small supporting text (xs, normal, tertiary color)
- **Label**: Form labels and small headings (sm, medium, secondary color)

### Button Text

- **ButtonLarge**: Large button text (md, medium)
- **ButtonMedium**: Standard button text (sm, medium)
- **ButtonSmall**: Small button text (xs, medium)

## Migration Guide

### Before (Inconsistent)

```typescript
<Text fontSize="2xl" fontWeight="bold" color="gray.800">Title</Text>
<Text fontSize="lg" color="gray.600">Description</Text>
<Text fontSize="sm" color="gray.500">Caption</Text>
```

### After (Consistent)

```typescript
<H2>Title</H2>
<BodyLarge>Description</BodyLarge>
<Caption>Caption</Caption>
```

## Benefits

1. **Consistency**: All text follows standardized patterns
2. **Maintainability**: Changes to typography can be made in one place
3. **Accessibility**: Proper heading hierarchy and contrast ratios
4. **Responsive**: Typography scales appropriately across screen sizes
5. **Theme Integration**: Colors and typography work together seamlessly

## Best Practices

1. Always use Typography components instead of raw Text components
2. Use semantic heading hierarchy (H1 → H2 → H3 → H4)
3. Use color constants instead of hardcoded color values
4. Prefer BodyMedium for most body text
5. Use Caption for secondary information
6. Use Label for form labels and small headings
