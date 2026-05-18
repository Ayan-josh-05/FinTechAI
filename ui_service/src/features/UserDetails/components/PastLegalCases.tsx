// src/features/user-details/components/PastLegalCases.tsx
import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react'
import { Badge } from '@/features/shared/components'
import { useNavigate } from '@tanstack/react-router'
import { useNavigationContext } from '@/utils/navigationContext'
import { COLORS } from '@/features/shared/constants/StyleConstants'

interface CaseStatusBadge {
  text: string
  color: string
}

interface PastLegalCase {
  title: string
  filed: string
  summary: string
  statusBadges: CaseStatusBadge[]
  case_id: string
}

interface UserDetails {
  pastLegalCases: PastLegalCase[]
}


const CaseCard = ({
  title,
  filed,
  summary,
  statusBadges,
  case_id,
}: PastLegalCase) => {
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
    <Box
      p={4}
      border="1px solid"
      borderColor={COLORS.neutral[200]}
      borderRadius="md"
    >
      <Flex justify="space-between" align="start" mb={2}>
        <Text 
          fontSize="md"
          fontWeight="medium"
          color={COLORS.neutral[800]}
          cursor="pointer"
          _hover={{ color: COLORS.primary[600] }}
          onClick={handleCaseClick}
        >
          {title}
        </Text>
        <Text fontSize="sm" color={COLORS.text.tertiary}>
          {filed}
        </Text>
      </Flex>
      <Text fontSize="sm" color={COLORS.text.tertiary} mb={3}>
        {summary}
      </Text>
      <Flex justify="space-between" align="center">
        <Badge
          items={statusBadges.map(badge => ({
            text: badge.text,
            type: badge.color
          }))}
        />
        <Button
          size="xs"
          variant="ghost"
          color={COLORS.primary[500]}
          onClick={handleCaseClick}
        >
          View Details
        </Button>
      </Flex>
    </Box>
  )
}

interface PastLegalCasesProps {
  userDetails: UserDetails
}

const PastLegalCases = ({ userDetails }: PastLegalCasesProps) => {
  const { pastLegalCases } = userDetails

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
        Past Legal Cases
      </Heading>
      <Box display="flex" flexDirection="column" gap={4}>
        {pastLegalCases.length === 0 ? (
          <Text fontSize="sm" color={COLORS.text.tertiary}>
            No past legal cases found.
          </Text>
        ) : (
          pastLegalCases.map((c, i) => (
            <CaseCard key={i} {...c} />
          ))
        )}
      </Box>
    </Box>
  )
}

export default PastLegalCases
