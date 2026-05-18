import { Box, Flex, Heading, Text } from '@chakra-ui/react'

import { COLORS } from '@/features/shared/constants/StyleConstants'
const ProfessionalBackground = (props: any) => {
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
          Professional Background
        </Heading>

        <Box mb={6}>
          <Heading size="sm" mb={3} color={COLORS.neutral[700]}>
            Education
          </Heading>
          <Box display="flex" flexDirection="column" gap={2}>
            {judgeData.professionalBackground.education.length > 0 ? (
              judgeData.professionalBackground.education.map(
                (edu: any, index: any) => (
                  <Text key={index} fontSize="sm" color={COLORS.text.secondary}>
                    • {edu}
                  </Text>
                ),
              )
            ) : (
              <Text fontSize="sm" color={COLORS.text.secondary}>
                -
              </Text>
            )}
          </Box>
        </Box>

        <Box>
          <Heading size="sm" mb={3} color={COLORS.neutral[700]}>
            Career Timeline
          </Heading>
          <Box display="flex" flexDirection="column" gap={3}>
            {judgeData.professionalBackground.careerTimeline.length > 0 ? (
              judgeData.professionalBackground.careerTimeline.map(
                (career: any, index: any) => (
                  <Flex key={index} align="center" gap={3}>
                    <Box
                      w={3}
                      h={3}
                      borderRadius="full"
                      bg={career.status === 'current' ? 'blue.500' : 'gray.300'}
                    />
                    <Box flex={1}>
                      <Text
                        fontWeight="semibold"
                        fontSize="sm"
                        color={COLORS.neutral[800]}
                      >
                        {career.position}
                      </Text>
                      <Text fontSize="xs" color={COLORS.text.tertiary}>
                        {career.period}
                      </Text>
                    </Box>
                  </Flex>
                ),
              )
            ) : (
              <Text fontSize="sm" color={COLORS.text.secondary}>
                -
              </Text>
            )}
          </Box>
        </Box>
      </Box>
    </>
  )
}

export default ProfessionalBackground
