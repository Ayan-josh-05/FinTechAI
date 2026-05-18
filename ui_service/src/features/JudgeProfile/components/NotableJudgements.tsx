import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react'
import { useNavigate } from '@tanstack/react-router'
import { Badge } from '@/features/shared/components'
import { useNavigationContext } from '@/utils/navigationContext'

import { COLORS } from '@/features/shared/constants/StyleConstants'

const NotableJudgements = (props: any) => {
  const { data: judgeData } = props
  const navigate = useNavigate()
  const { createNavigationWithContext } = useNavigationContext()

  const handleViewDetails = (judgment: any) => {
    // Get case ID from judgment data (handle both caseId and case_id from API)
    const caseId = judgment.caseId || judgment.case_id

    if (!caseId) {
      console.error('No case ID found in judgment data:', judgment)
      return
    }

    // Use the navigation context hook to preserve all current context
    const navigation = createNavigationWithContext(
      '/case-details/$caseId',
      { caseId },
      {
        caseId,
        caseNumber: judgment.caseNumber || judgment.case_number,
        caseTitle: judgment.title || 'Case Details',
      },
    )

    navigate(navigation)
  }
  return (
    <>
      <Box
        bg="white"
        borderRadius="lg"
        border="1px solid"
        borderColor={COLORS.neutral[200]}
        boxShadow="sm"
        p={6}
      >
        <Heading size="md" mb={4} color={COLORS.neutral[800]}>
          Notable Judgments
        </Heading>
        <Box display="flex" flexDirection="column" gap={4} maxH="500px" overflowY="auto">
          {judgeData.notableJudgments.length > 0 ? (
            judgeData.notableJudgments.map((judgment: any, index: any) => (
              <Box
                key={index}
                p={4}
                border="1px solid"
                borderColor={COLORS.neutral[200]}
                borderRadius="md"
              >
                <Flex justify="space-between" align="start" mb={2}>
                  <Heading size="sm" color={COLORS.neutral[800]}>
                    {judgment.title}
                  </Heading>
                  <Text fontSize="sm" color={COLORS.text.tertiary}>
                    {judgment.date}
                  </Text>
                </Flex>
                <Text color={COLORS.text.secondary} mb={3} fontSize="sm">
                  {judgment.description}
                </Text>
                <Flex justify="space-between" align="center">
                  <Badge
                    items={judgment.status}
                    // variant={judgment.status}
                  />
                  <Button
                    size="xs"
                    variant="ghost"
                    color={COLORS.primary[500]}
                    onClick={() => handleViewDetails(judgment)}
                  >
                    View Details
                  </Button>
                </Flex>
              </Box>
            ))
          ) : (
            <Text fontSize="sm" color={COLORS.text.tertiary}>
              No Data Available
            </Text>
          )}
        </Box>
      </Box>
    </>
  )
}

export default NotableJudgements
