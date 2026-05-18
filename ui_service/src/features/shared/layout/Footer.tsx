import { Box, Container, Text } from '@chakra-ui/react'
import { STYLES } from '../constants/StyleConstants'

import { COLORS } from '@/features/shared/constants/StyleConstants'

export default function Footer() {
  return (
    <Box
      {...STYLES.colors.secondary}
      {...STYLES.border.sm}
      borderTop="1px solid"
      borderColor={COLORS.neutral[300]}
      {...STYLES.spacing.lg}
    >
      <Container maxW="7xl" mx="auto" textAlign="center">
        <Text color={COLORS.text.secondary}>
          &copy; 2025 CubicTree. All rights reserved.
        </Text>
      </Container>
    </Box>
  )
}
