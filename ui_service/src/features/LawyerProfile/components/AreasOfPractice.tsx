import { Box, Flex, Heading, Text } from '@chakra-ui/react'
import { Badge } from '@/features/shared/components'

import { COLORS } from '@/features/shared/constants/StyleConstants'
interface AreasOfPracticeProps {
  data: Array<string>
}

const AreasOfPractice = ({ data }: AreasOfPracticeProps) => {
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
        Areas of Practice
      </Heading>

      {data.length === 0 ? (
        <Text color={COLORS.neutral[600]} fontSize="sm">
          No Data Available
        </Text>
      ) : (
        <Flex wrap="wrap" gap={2}>
          {data.map((item, key) => {
            return (
              <span key={`areaOfPractice-${key}`}>
                <Badge items={[{ text: item, type: 'info', rounded: true }]} />
              </span>
            )
          })}
        </Flex>
      )}
    </Box>
  )
}

export default AreasOfPractice
