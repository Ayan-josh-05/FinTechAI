// src/features/user-details/components/IdentityDocuments.tsx
import { Box, Grid, GridItem, Heading, Text, VStack } from '@chakra-ui/react'
import type { UserDetails } from '../types/types'

import { COLORS } from '@/features/shared/constants/StyleConstants'

const Field = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Text fontSize="sm" color={COLORS.text.tertiary} mb={1}>
      {label}
    </Text>
    <Text fontSize="sm" color={COLORS.neutral[800]} fontWeight="medium">
      {value}
    </Text>
  </Box>
)

const DocCard = ({
  children,
}: {
  children: React.ReactNode
  isVerified: boolean
}) => (
  <Box
    border="1px"
    borderColor={COLORS.neutral[200]}
    rounded="md"
    p={4}
    position="relative"
  >
    <VStack align="start" gap={3}>
      {children}
    </VStack>
  </Box>
)

interface IdentityDocumentsProps {
  userDetails: UserDetails
}

const IdentityDocuments = ({ userDetails }: IdentityDocumentsProps) => {
  const { identityDocuments } = userDetails

  return (
    <Box
      bg="white"
      borderRadius="lg"
      border="1px solid"
      borderColor={COLORS.neutral[200]}
      boxShadow="sm"
      p={6}
    >
      <Heading size="md" mb={2} color={COLORS.neutral[800]}>
        Identity Documents
      </Heading>
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
        <GridItem>
          <DocCard 
          isVerified={identityDocuments.pan.verified}
          >
            <Field
              label="PAN Number:"
              value={identityDocuments.pan.number || 'N/A'}
            />
          </DocCard>
        </GridItem>
        <GridItem>
          <DocCard
            isVerified={identityDocuments.aadhar.verified}
          >
            <Field
              label="Aadhar Number:"
              value={identityDocuments.aadhar.numberMasked || 'N/A'}
            />
          </DocCard>
        </GridItem>
      </Grid>
    </Box>
  )
}

export default IdentityDocuments
