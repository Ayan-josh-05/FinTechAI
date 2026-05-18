import { HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { COLORS } from '@/features/shared/constants/StyleConstants'
import Section from '@/features/UserDetails/components/Section'
import { FaFile } from 'react-icons/fa'

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
    justify="center"
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

const QuickActions = () => {
  return (
    <Section title="Quick Actions">
      <VStack gap={3} align="stretch">
        <ActionRow
          icon={FaFile}
          label="Generate Report"
          onClick={() => {}}
        />
        {/* <ActionRow icon={FiFlag} label="Flag for Review" onClick={() => {}} />
        <ActionRow
          icon={FiFileText}
          label="Generate Report"
          onClick={() => {}}
        />
        <ActionRow icon={FiBell} label="Set Alert" onClick={() => {}} /> */}
      </VStack>
    </Section>
  )
}

export default QuickActions
