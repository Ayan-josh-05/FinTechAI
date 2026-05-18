// src/features/user-details/components/PersonalInformation.tsx
import { Box, Text, Grid, Heading } from '@chakra-ui/react'
import type { UserDetails } from '../types/types'

import { COLORS } from '@/features/shared/constants/StyleConstants'

const Row = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Text fontSize="sm" color={COLORS.text.tertiary} mb={1}>
      {label}
    </Text>
    <Text fontSize="sm" fontWeight="medium" color={COLORS.neutral[800]}>
      {value}
    </Text>
  </Box>
)

interface PersonalInformationProps {
  userDetails: UserDetails
}

const PersonalInformation = ({ userDetails }: PersonalInformationProps) => {
  const { personalInformation } = userDetails

  return (
    <Box
      bg="white"
      borderRadius="lg"
      border="1px solid"
      borderColor={COLORS.neutral[200]}
      boxShadow="sm"
      p={6}
    >
      <Heading size="md" mb={4} color={COLORS.neutral[800]}>
        Personal Information
      </Heading>
      <Box>
        <Heading size="sm" mb={3} color={COLORS.neutral[700]}>
          Basic Details
        </Heading>
        <Grid templateColumns="repeat(2, 1fr)" gap={4} width="100%">
          <Row label="Full Name:" value={personalInformation.fullName} />
          <Row label="Date of Birth:" value={personalInformation.dateOfBirth} />
          <Row label="Gender:" value={personalInformation.gender} />
          <Row label="Occupation:" value={personalInformation.occupation} />
        </Grid>
      </Box>
    </Box>
  )
}

export default PersonalInformation
