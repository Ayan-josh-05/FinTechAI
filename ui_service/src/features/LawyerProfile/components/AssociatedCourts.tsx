import { Box, Flex, Heading, Text } from '@chakra-ui/react'
import { Badge } from '@/features/shared/components'

import { COLORS } from '@/features/shared/constants/StyleConstants'
interface AssociatedCourt {
  name: string
  role: string
  status: Array<{ text: string; type: string }>
}

interface AssociatedCourtsProps {
  data: Array<AssociatedCourt>
}

const AssociatedCourts = ({ data }: AssociatedCourtsProps) => {
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
        Associated Courts
      </Heading>
      <Box display="flex" flexDirection="column" gap={3}>
        {data.map((court, index) => (
          <Flex
            key={index}
            justify="space-between"
            align="center"
            p={3}
            border="1px solid"
            borderColor={COLORS.neutral[100]}
            borderRadius="md"
          >
            <Box>
              <Text fontWeight="medium" color={COLORS.neutral[800]} fontSize="sm">
                {court.name}
              </Text>
              <Text color={COLORS.text.tertiary} fontSize="xs">
                {court.role}
              </Text>
            </Box>
            <Badge items={court.status} />
          </Flex>
        ))}
      </Box>
    </Box>
  )
}
export default AssociatedCourts
