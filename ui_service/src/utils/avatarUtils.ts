/**
 * Utility functions for avatar generation and display
 */

/**
 * Generates initials from a full name
 * @param name - The full name to extract initials from
 * @returns The initials (up to 2 characters)
 */
export const getInitials = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return '?'
  }

  // Clean the name and split into words
  const cleanName = name.trim()
  if (!cleanName) {
    return '?'
  }

  const words = cleanName.split(/\s+/).filter(word => word.length > 0)

  if (words.length === 0) {
    return '?'
  }

  if (words.length === 1) {
    // Single word - take first two characters
    return words[0].substring(0, 2).toUpperCase()
  }

  // Multiple words - take first character of first and last word
  const firstInitial = words[0].charAt(0)
  const lastInitial = words[words.length - 1].charAt(0)

  return `${firstInitial}${lastInitial}`.toUpperCase()
}

/**
 * Generates a consistent background color for an avatar based on the name
 * @param name - The name to generate color for
 * @returns A CSS color value
 */
export const getAvatarColor = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return '#9CA3AF' // neutral gray
  }

  // Predefined color palette for avatars
  const colors = [
    '#EF4444', // red
    '#F97316', // orange  
    '#F59E0B', // amber
    '#84CC16', // lime
    '#22C55E', // green
    '#06B6D4', // cyan
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#6366F1', // indigo
  ]

  // Generate a consistent index based on the name
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % colors.length
  return colors[index]
}
