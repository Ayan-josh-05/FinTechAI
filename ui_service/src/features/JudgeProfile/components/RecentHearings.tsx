import { Box, Grid, Heading, Text } from '@chakra-ui/react'
import { Badge } from '@/features/shared/components'

import { COLORS } from '@/features/shared/constants/StyleConstants'

const RecentHearings = (props: any) => {
  const { data: judgeData } = props

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
          Recent Hearings
        </Heading>
        <Box>
          {judgeData.recentHearings.length > 0 ? (
            <>
              {/* Table Header */}
              <Grid
                templateColumns="2fr 1fr 1fr 1fr 1fr"
                gap={4}
                mb={3}
                pb={2}
                borderBottom="1px solid"
                borderColor={COLORS.neutral[200]}
              >
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color={COLORS.neutral[700]}
                >
                  Case Number
                </Text>
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color={COLORS.neutral[700]}
                >
                  Date
                </Text>
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color={COLORS.neutral[700]}
                >
                  Type
                </Text>
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color={COLORS.neutral[700]}
                >
                  No. of Hearings
                </Text>
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color={COLORS.neutral[700]}
                >
                  Status
                </Text>
              </Grid>
              {/* Table Body - Scrollable */}
              <Box maxH="500px" overflowY="auto">
                {judgeData.recentHearings.map((hearing: any, index: any) => (
                  <Grid
                    key={index}
                    templateColumns="2fr 1fr 1fr 1fr 1fr"
                    gap={4}
                    py={2}
                    borderBottom="1px solid"
                    borderColor={COLORS.neutral[100]}
                  >
                    <Text fontSize="sm" fontWeight="medium">
                      {hearing.caseNumber}
                    </Text>
                    <Text fontSize="sm">{hearing.date}</Text>
                    <Text fontSize="sm">{hearing.type}</Text>
                    <Text fontSize="sm">{hearing.no_of_hearings}</Text>
                    <Box>
                      <Badge items={hearing.status} />
                    </Box>
                  </Grid>
                ))}
              </Box>
            </>
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

export default RecentHearings
