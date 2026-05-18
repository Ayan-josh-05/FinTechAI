import { Box, Flex, Heading, Link, Separator, Text, VStack } from '@chakra-ui/react'
import { useNavigate } from '@tanstack/react-router'
import type { InvolvedParty } from '../types'
import { Badge } from '@/features/shared/components'
import { useNavigationContext } from '@/utils/navigationContext'

import { COLORS } from '@/features/shared/constants/StyleConstants'

interface InvolvedPartiesProps {
  involvedParties: Array<InvolvedParty>
  caseNumber?: string
}

const InvolvedParties = ({
  involvedParties,
  caseNumber,
}: InvolvedPartiesProps) => {
  const navigate = useNavigate()
  const { createNavigationWithContext } = useNavigationContext()

  const handlePartyClick = (
    entityId: string,
    partyName: string,
    partyType: string,
  ) => {
    if (entityId && entityId !== '') {
      // Route to user details for Individual type, organization page for all others
      if (partyType === 'Individual') {
        const navigation = createNavigationWithContext(
          '/user-details/$userId',
          { userId: entityId },
          {
            ...(caseNumber && { caseNumber }), // Include the actual case number if available
            partyId: entityId,
            partyName: partyName,
          },
        )
        navigate(navigation)
      } else {
        const navigation = createNavigationWithContext(
          '/organization/$id',
          { id: entityId },
          {
            ...(caseNumber && { caseNumber }), // Include the actual case number if available
            partyId: entityId,
            partyName: partyName,
          },
        )
        navigate(navigation)
      }
    }
  }
  // If no data available, show placeholder
  if (involvedParties.length === 0) {
    return (
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        shadow="sm"
        border="1px"
        borderColor={COLORS.neutral[200]}
      >
        <Heading size="sm" mb={4} color={COLORS.neutral[800]}>
          Involved Parties
        </Heading>
        <Text color={COLORS.text.tertiary} textAlign="center">
          No data available
        </Text>
      </Box>
    )
  }

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      shadow="sm"
      border="1px"
      borderColor={COLORS.neutral[200]}
    >
      <Heading size="sm" mb={4} color={COLORS.neutral[800]}>
        Involved Parties
      </Heading>

      <VStack gap={4} align="stretch">
        {/* Group parties by role dynamically */}
        {Array.from(new Set(involvedParties.map((p) => p.role))).map((role) => {
          const partiesOfType = involvedParties.filter((p) => p.role === role)
          if (partiesOfType.length === 0) return null

          return (
            <Box
              key={role}
              borderRadius="lg"
              shadow="sm"
              border="1px"
              borderColor={COLORS.neutral[200]}
              p={4}
            >
              <Flex justify="space-between" align="center" mb={4}>
                <Text fontWeight="semibold" color={COLORS.neutral[800]}>
                  {role}s
                </Text>
              </Flex>

              <VStack gap={0} align="stretch">
                {partiesOfType.map((party, index) => (
                  <Box key={index} py={3}>
                    <Flex justify="space-between" align="center" mb={3}>
                        <Link
                          color={COLORS.primary[600]}
                          textDecoration="underline"
                          cursor="pointer"
                          onClick={() =>
                            handlePartyClick(party.entity_id!, party.name, party.type)
                          }
                          _hover={{ color: COLORS.primary[700] }}
                          fontWeight="normal"
                        >
                          {party.name}
                        </Link>
                      <Badge items={[{ text: party.type, type: 'info' }]} />
                    </Flex>

                    {party.identificationNumber &&
                      party.identificationNumber.length > 0 && (
                        <Flex
                          mt={2}
                          justify="space-between"
                          fontSize="sm"
                          color={COLORS.text.secondary}
                          wrap="wrap"
                          gap={2}
                        >
                          {party.identificationNumber.map((id, idIndex) => (
                            <Text key={idIndex} fontSize="small">
                              {id.type}: {id.value}
                            </Text>
                          ))}
                        </Flex>
                      )}
                    {index < partiesOfType.length - 1 && (
                      <Separator 
                        mt={3} 
                        borderColor={COLORS.neutral[200]}
                      />
                    )}
                  </Box>
                ))}
              </VStack>
            </Box>
          )
        })}
      </VStack>
    </Box>
  )
}

export default InvolvedParties
