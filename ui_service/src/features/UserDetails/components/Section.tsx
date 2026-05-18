import { Box, Heading } from '@chakra-ui/react';
import type { ReactNode } from 'react'
import { STYLES } from '@/features/shared/constants/StyleConstants';

import { COLORS } from '@/features/shared/constants/StyleConstants'
const Section = ({
  title,
  right,
  children,
}: { title: string; right?: ReactNode; children: ReactNode }) => {
  return (
    <Box bg="white" border="1px" borderColor={COLORS.neutral[200]} rounded="md" p={5} shadow="sm">
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Heading fontSize="lg" fontWeight="semibold" color={COLORS.neutral[800]}>
          {title}
        </Heading>
        {right ? <Box>{right}</Box> : null}
      </Box>
      <Box
      as="hr"
      border="0"
      borderBottom="1px solid"
      borderColor={COLORS.neutral[200]}
      my={4}
    />
      <Box {...STYLES.container}>{children}</Box>
    </Box>
  )
}

export default Section
