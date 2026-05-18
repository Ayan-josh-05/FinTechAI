// src/features/user-details/components/AddressInformation.tsx
import { Box, Grid, GridItem, Heading, Text, VStack } from '@chakra-ui/react'
import type { UserDetails } from '../types/types'

import { COLORS } from '@/features/shared/constants/StyleConstants'

const AddressCard = ({
  title,
  lines,
}: {
  title: string
  lines: string
}) => (
  <Box
    border="1px solid"
    borderColor={COLORS.neutral[200]}
    borderRadius="md"
    p={4}
  >
    <Heading size="sm" color={COLORS.neutral[800]} mb={3}>
      {title}
    </Heading>
    <VStack align="start" gap={0}>
      {lines.length > 0 ? (
        <Text fontSize="sm" color={COLORS.text.secondary}>
          {lines}
        </Text>
      ) : (
        <Text fontSize="sm" color={COLORS.text.tertiary}>
          N/A
        </Text>
      )}
    </VStack>
  </Box>
)

interface AddressInformationProps {
  userDetails: UserDetails
}

const AddressInformation = ({ userDetails }: AddressInformationProps) => {
  const { addresses } = userDetails

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
        Address Information
      </Heading>
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
        <GridItem>
          <AddressCard title="Permanent Address" lines={addresses.permanent} />
        </GridItem>
        <GridItem>
          <AddressCard title="Current Address" lines={addresses.current} />
        </GridItem>
      </Grid>
    </Box>
  )
}

export default AddressInformation
