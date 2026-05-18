// src/features/user-details/components/ActiveLegalCases.tsx
import { Badge, Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import Section from './Section'
import { useNavigate } from '@tanstack/react-router'
import { useNavigationContext } from '@/utils/navigationContext'
import { COLORS } from '@/features/shared/constants/StyleConstants'

interface CaseStatusBadge {
  text: string
  color: 'red' | 'yellow' | 'green' | 'purple' | 'gray'
}

interface ActiveLegalCase {
  title: string
  caseNo: string
  filed: string
  summary: string
  nextHearing?: string
  statusBadges: CaseStatusBadge[]
  case_id: string
}

interface UserDetails {
  activeLegalCases: ActiveLegalCase[]
}

const Pill = ({ b }: { b: CaseStatusBadge }) => {
  const map: Record<CaseStatusBadge['color'], string> = {
    red: 'red',
    yellow: 'yellow',
    green: 'green',
    purple: 'purple',
    gray: 'gray',
  }
  return (
    <Badge colorScheme={map[b.color]} variant="subtle">
      {b.text}
    </Badge>
  )
}

const CaseCard = ({
  title,
  caseNo,
  filed,
  summary,
  nextHearing,
  statusBadges,
  case_id,
}: ActiveLegalCase) => {
  const navigate = useNavigate()
  const { createNavigationWithContext } = useNavigationContext()

  const handleCaseClick = () => {
    if (case_id) {
      const navigation = createNavigationWithContext(
        '/case-details/$caseId',
        { caseId: case_id },
        { caseTitle: title }
      )
      navigate(navigation)
    }
  }

  return (
  <Box border="1px" borderColor={COLORS.neutral[200]} rounded="md" p={4}>
    <HStack justify="space-between" align="start" mb={2}>
      <Text fontWeight="semibold" color={COLORS.text.primary}>
        {title}
      </Text>
      <HStack gap={2}>
        {statusBadges.map((b: CaseStatusBadge, idx: number) => (
          <Pill b={b} key={idx} />
        ))}
      </HStack>
    </HStack>

    <HStack gap={6} mb={2} color={COLORS.neutral[700]} fontSize="sm">
      <Text>Case No: {caseNo}</Text>
      <Text>Filed: {filed}</Text>
    </HStack>

    <Text color={COLORS.neutral[800]} mb={3}>
      {summary}
    </Text>

    <HStack justify="space-between">
      {nextHearing ? (
        <Text fontSize="sm" color={COLORS.text.secondary}>
          Next Hearing: {nextHearing}
        </Text>
      ) : (
        <Box />
      )}
      <Button 
        size="sm" 
        variant="ghost" 
        color={COLORS.primary[500]}
        onClick={handleCaseClick}
      >
        View Details
      </Button>
    </HStack>
  </Box>
  )
}

interface ActiveLegalCasesProps {
  userDetails: UserDetails
}

const ActiveLegalCases = ({ userDetails }: ActiveLegalCasesProps) => {
  const { activeLegalCases } = userDetails

  if (activeLegalCases.length === 0) {
    return (
      <Section title="Active Legal Cases">
        <Text color={COLORS.neutral[600]} fontSize="sm">
          No active legal cases found.
        </Text>
      </Section>
    )
  }

  return (
    <Section title="Active Legal Cases">
      <VStack align="stretch" gap={4}>
        {activeLegalCases.map((c, i) => (
          <CaseCard key={i} {...c} />
        ))}
      </VStack>
    </Section>
  )
}

export default ActiveLegalCases
