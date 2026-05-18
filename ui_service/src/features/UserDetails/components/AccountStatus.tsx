// src/features/user-details/components/AccountStatus.tsx
import { Box, HStack, Heading, Text, VStack } from '@chakra-ui/react'
import type { UserDetails } from '../types/types'

import { COLORS } from '@/features/shared/constants/StyleConstants'

const Line = ({
  label,
  value,
  badge,
}: {
  label: string
  value?: string
  badge?: React.ReactNode
}) => (
  <HStack justify="space-between" py={1.5}>
    <Text fontSize="sm" color={COLORS.text.tertiary}>
      {label}
    </Text>
    {badge ? (
      badge
    ) : (
      <Text fontSize="sm" color={COLORS.neutral[800]}>
        {value}
      </Text>
    )}
  </HStack>
)

interface AccountStatusProps {
  userDetails: UserDetails
}

const AccountStatus = ({ userDetails }: AccountStatusProps) => {
  const { account } = userDetails

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
        Account Status
      </Heading>
      <VStack align="stretch" gap={3}>
        {/* <Line
          label="Verification:"
          badge={
            <Badge
              items={[{
                text: account.verification,
                type: getVerificationType(account.verification)
              }]}
            />
          }
        /> */}
        <Line label="Account Type:" value={account.accountType} />
        <Line
          label="Cases Count:"
          value={`${account.casesCount.active} Active, ${account.casesCount.closed} Closed`}
        />
      </VStack>
    </Box>
  )
}

export default AccountStatus
