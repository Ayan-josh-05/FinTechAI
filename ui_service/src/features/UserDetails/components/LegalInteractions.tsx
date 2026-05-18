// src/features/user-details/components/LegalInteractions.tsx
import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import Section from './Section'
import type { LegalInteraction, UserDetails } from '../types/types'

import { COLORS } from '@/features/shared/constants/StyleConstants'

const Dot = ({ color }: { color: 'blue' | 'green' | 'yellow' }) => (
  <Box w={2.5} h={2.5} rounded="full" bg={`${color}.500`} />
)

const Item = ({ dot, title, context, note }: LegalInteraction) => (
  <HStack
    align="start"
    border="1px"
    borderColor={COLORS.neutral[200]}
    rounded="md"
    p={4}
    gap={3}
  >
    <Dot color={dot} />
    <Box>
      <Text fontWeight="semibold" color={COLORS.text.primary}>
        {title}
      </Text>
      <Text fontSize="sm" color={COLORS.text.secondary}>
        {context}
      </Text>
      <Text mt={1} color={COLORS.neutral[800]}>
        {note}
      </Text>
    </Box>
  </HStack>
)

interface LegalInteractionsProps {
  userDetails: UserDetails
}

const LegalInteractions = ({ userDetails }: LegalInteractionsProps) => {
  const { legalInteractions } = userDetails

  if (legalInteractions.length === 0) {
    return (
      <Section title="Legal Interactions">
        <Text color={COLORS.neutral[600]} fontSize="sm">
          No legal interactions found.
        </Text>
      </Section>
    )
  }

  return (
    <Section title="Legal Interactions">
      <VStack align="stretch" gap={3}>
        {legalInteractions.map((it, idx) => (
          <Item key={idx} {...it} />
        ))}
      </VStack>
    </Section>
  )
}

export default LegalInteractions
