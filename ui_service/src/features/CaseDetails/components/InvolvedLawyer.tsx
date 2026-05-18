import { Box, Heading, Link, Text, VStack } from '@chakra-ui/react'
import { useNavigate } from '@tanstack/react-router'
import type { InvolvedLawyer } from '../types'
import { useNavigationContext } from '@/utils/navigationContext'

import { COLORS } from '@/features/shared/constants/StyleConstants'

interface InvolvedLawyerProps {
  involvedLawyers: Array<InvolvedLawyer>
}

const InvolvedLawyers = ({ involvedLawyers }: InvolvedLawyerProps) => {
  const navigate = useNavigate()
  const { createNavigationWithContext } = useNavigationContext()

  const handleLawyerClick = (lawyer: InvolvedLawyer) => {
    if (lawyer.lawyer_id && lawyer.lawyer_id !== '') {
      // Use the navigation context hook to preserve all current context
      const navigation = createNavigationWithContext(
        '/lawyer-profile/$lawyerId',
        { lawyerId: lawyer.lawyer_id },
        {
          lawyerId: lawyer.lawyer_id,
          name: lawyer.name,
          barNumber: lawyer.bar_number,
          specialization: lawyer.specialization,
        },
      )

      navigate(navigation)
    }
  }
  // If no data available, show placeholder
  if (involvedLawyers.length === 0) {
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
          Involved Lawyers
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
        Involved Lawyers
      </Heading>

      <VStack gap={4} align="stretch">
        {involvedLawyers.map((lawyer, index) => (
          <Box
            key={lawyer.lawyer_id || index}
            borderRadius="lg"
            shadow="sm"
            border="1px"
            borderColor={COLORS.neutral[200]}
            p={4}
          >
            <Link
              color={COLORS.primary[600]}
              textDecoration="underline"
              cursor="pointer"
              onClick={() => handleLawyerClick(lawyer)}
              _hover={{ color: COLORS.primary[700] }}
              fontWeight="medium"
              mb={2}
            >
              {lawyer.name}
            </Link>

            <Text fontSize="sm" color={COLORS.text.secondary} mb={1}>
              Bar Number: {lawyer.bar_number}
            </Text>

            <Text fontSize="sm" color={COLORS.text.secondary}>
              Specialization: {lawyer.specialization}
            </Text>
          </Box>
        ))}
      </VStack>
    </Box>
  )
}

export default InvolvedLawyers
