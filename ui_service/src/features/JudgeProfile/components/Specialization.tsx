import { Box, Flex, Grid, Heading, Text } from '@chakra-ui/react'
import { Badge } from '@/features/shared/components'

import { COLORS } from '@/features/shared/constants/StyleConstants'

const Specialization = (props: any) => {
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
          Areas of Specialization
        </Heading>

        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
          <Box
            borderRadius="lg"
            border="1px solid"
            borderColor={COLORS.neutral[200]}
            boxShadow="sm"
            p={3}
            pt={4}
          >
            <Heading size="sm" mb={3} color={COLORS.neutral[700]}>
              Primary Expertise
            </Heading>
            <Flex wrap="wrap" gap={2}>
              {judgeData.areasOfSpecialization.primary.length > 0 ? (
                judgeData.areasOfSpecialization.primary.map(
                  (area: any, index: any) => {
                    const status = [{ text: area, type: 'info' }]
                    return (
                      <span key={`spec-primary-${index}`}>
                        <Badge items={status} />
                      </span>
                    )
                  },
                )
              ) : (
                <Text fontSize="sm" color={COLORS.text.tertiary}>
                  No Data Available
                </Text>
              )}
            </Flex>
          </Box>

          <Box
            borderRadius="lg"
            border="1px solid"
            borderColor={COLORS.neutral[200]}
            boxShadow="sm"
            p={3}
            pt={4}
          >
            <Heading size="sm" mb={3} color={COLORS.neutral[700]}>
              Secondary Areas
            </Heading>
            <Flex wrap="wrap" gap={2}>
              {judgeData.areasOfSpecialization.secondary.length > 0 ? (
                judgeData.areasOfSpecialization.secondary.map(
                  (area: any, index: any) => {
                    const status = [{ text: area, type: 'inactive' }]
                    return (
                      <span key={`spec-primary-${index}`}>
                        <Badge items={status} />
                      </span>
                    )
                  },
                )
              ) : (
                <Text fontSize="sm" color={COLORS.text.tertiary}>
                  No Data Available
                </Text>
              )}
            </Flex>
          </Box>
        </Grid>
      </Box>
    </>
  )
}

export default Specialization
