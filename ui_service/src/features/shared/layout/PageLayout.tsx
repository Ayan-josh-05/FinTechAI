import { Box } from '@chakra-ui/react'
import type { ReactNode } from 'react'

import { COLORS } from '@/features/shared/constants/StyleConstants'

interface PageLayoutProps {
  children: ReactNode
  py?: number | string
  bg?: string
}

/**
 * Consistent page layout wrapper that provides fixed margins across all screen sizes.
 * This ensures that content width remains consistent and margins don't expand on larger screens.
 */
export const PageLayout = ({
  children,
  py = 6,
  bg = COLORS.neutral[50],
}: PageLayoutProps) => {
  return (
    <Box minH="100vh" bg={bg} py={py}>
      <Box w="100%" px={8}>
        {children}
      </Box>
    </Box>
  )
}

export default PageLayout
