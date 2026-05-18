// src/features/user-details/components/QuickActions.tsx
import { HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { FiBell, FiFileText, FiFlag, FiSearch } from 'react-icons/fi'
import Section from './Section'
// import type { UserDetails } from '../types/types'

import { COLORS } from '@/features/shared/constants/StyleConstants'

const ActionRow = ({
  icon,
  label,
  onClick,
}: {
  icon: any
  label: string
  onClick?: () => void
}) => (
  <HStack
    as="button"
    onClick={onClick}
    w="full"
    justify="flex-start"
    px={3}
    py={3}
    rounded="md"
    border="1px solid"
    borderColor={COLORS.neutral[200]}
    _hover={{ bg: 'gray.50' }}
    transition="all 0.15s"
  >
    <Icon as={icon} boxSize={5} color={COLORS.primary[600]} />
    <Text fontWeight="medium" color={COLORS.neutral[800]}>
      {label}
    </Text>
  </HStack>
)

// interface QuickActionsProps {
//   userDetails: UserDetails
// }

const QuickActions = () => {
  return (
    <Section title="Quick Actions">
      <VStack gap={3} align="stretch">
        <ActionRow
          icon={FiSearch}
          label="Search Related Cases"
          onClick={() => {}}
        />
        <ActionRow icon={FiFlag} label="Flag for Review" onClick={() => {}} />
        <ActionRow
          icon={FiFileText}
          label="Generate Report"
          onClick={() => {}}
        />
        <ActionRow icon={FiBell} label="Set Alert" onClick={() => {}} />
      </VStack>
    </Section>
  )
}

export default QuickActions
