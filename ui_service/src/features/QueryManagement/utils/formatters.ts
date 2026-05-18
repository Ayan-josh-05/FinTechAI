/**
 * Format a title string by capitalizing each word and joining with spaces
 */
export const formatTitle = (title: string): string => {
  return title
    .split('_')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
