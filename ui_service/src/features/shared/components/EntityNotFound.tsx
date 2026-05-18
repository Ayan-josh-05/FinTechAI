import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { FiAlertCircle } from 'react-icons/fi'

import { Breadcrumb } from '@/features/shared/components'
import { COLORS } from '@/features/shared/constants/StyleConstants'

interface EntityNotFoundProps {
  entityType: string
  breadcrumbItems?: Array<{
    label: string
    path?: string
  }>
}

export const EntityNotFound = ({
  entityType,
  breadcrumbItems = [],
}: EntityNotFoundProps) => {
  return (
    <Box minH="100vh" bg={COLORS.neutral[50]}>
      {/* Breadcrumb Section */}
      {breadcrumbItems.length > 0 && (
        <Box
          w="100%"
          bg="white"
          borderBottom="1px"
          borderColor={COLORS.neutral[200]}
          mb={4}
          mt={2}
        >
          <Container maxW="7xl" mx="auto" px={6}>
            <Box w="100%" pl={1} py={1}>
              <Breadcrumb items={breadcrumbItems} />
            </Box>
          </Container>
        </Box>
      )}

      {/* Not Found Message */}
      <Container maxW="7xl" mx="auto" px={6}>
        <Box
          bg="white"
          borderRadius="lg"
          border="1px"
          borderColor={COLORS.neutral[200]}
          p={12}
          mt={8}
        >
          <VStack gap={4}>
            <Box
              p={4}
              borderRadius="full"
              bg={COLORS.warning[50]}
              color={COLORS.warning[600]}
            >
              <FiAlertCircle size={48} />
            </Box>
            <Heading size="lg" color={COLORS.text.primary}>
              {entityType} Not Found
            </Heading>
            <Text color={COLORS.text.secondary} textAlign="center">
              The {entityType.toLowerCase()} profile you're looking for doesn't exist or
              may have been removed.
            </Text>
          </VStack>
        </Box>
      </Container>
    </Box>
  )
}
