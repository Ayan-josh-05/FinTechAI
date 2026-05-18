import { Box, Button, Flex, Heading, Link, Text } from '@chakra-ui/react'
import { Badge } from '@/features/shared/components'
import { useNavigate } from '@tanstack/react-router'
import { useNavigationContext } from '@/utils/navigationContext'

import { COLORS } from '@/features/shared/constants/StyleConstants'

interface RecentCase {
  case_id: string
  title: string
  description: string
  court: string
  court_id: string
  concluded?: string
  filed?: string
  status: Array<{ text: string; type: string }>
  category: Array<{ text: string; type: string }>
}

interface RecentCasesProps {
  data: Array<RecentCase>
}

const RecentCases = ({ data }: RecentCasesProps) => {
  const navigate = useNavigate()
  const { createNavigationWithContext } = useNavigationContext()

  const handleCourtClick = (courtId: string, courtName: string) => {
    const navigation = createNavigationWithContext(
      '/court-details/$courtId',
      { courtId },
      { courtName }
    )
    navigate(navigation)
  }

  const handleCaseClick = (caseId: string, caseTitle: string) => {
    const navigation = createNavigationWithContext(
      '/case-details/$caseId',
      { caseId },
      { caseTitle }
    )
    navigate(navigation)
  }

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
        Recent Represented Cases
      </Heading>
      <Box display="flex" flexDirection="column" gap={4} maxH="500px" overflowY="auto">
        {data.map((caseItem, index) => (
          <Box
            key={index}
            p={4}
            border="1px solid"
            borderColor={COLORS.neutral[200]}
            borderRadius="md"
          >
            <Flex justify="space-between" align="start" mb={2}>
              <Heading size="sm" color={COLORS.neutral[800]} flex={1}>
                {caseItem.title}
              </Heading>
              <Flex gap={2}>
                <Badge items={caseItem.status} />
                <Badge items={caseItem.category} />
              </Flex>
            </Flex>
            <Text color={COLORS.text.secondary} mb={3} fontSize="sm">
              {caseItem.description}
            </Text>
            <Flex justify="space-between" align="center" fontSize="sm">
              <Box>
                <Text color={COLORS.text.secondary}>
                  Court:{' '}
                  <Link
                    color={COLORS.primary[600]}
                    fontWeight="medium"
                    _hover={{ textDecoration: 'underline' }}
                    onClick={() => handleCourtClick(caseItem.court_id, caseItem.court)}
                    cursor="pointer"
                  >
                    {caseItem.court}
                  </Link>
                </Text>
                <Text color={COLORS.text.tertiary}>
                  {caseItem.concluded
                    ? `Concluded: ${caseItem.concluded}`
                    : `Filed: ${caseItem.filed}`}
                </Text>
              </Box>
              <Button 
                size="xs" 
                variant="ghost" 
                color={COLORS.primary[500]}
                onClick={() => handleCaseClick(caseItem.case_id, caseItem.title)}
              >
                View Details
              </Button>
            </Flex>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default RecentCases
