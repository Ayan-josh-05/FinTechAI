import { memo } from 'react'
import { Box, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import { useNavigate } from '@tanstack/react-router'
import { FiArrowLeft, FiHome } from 'react-icons/fi'
import { Button } from '@/features/shared/components'
import { COLORS } from '@/features/shared/constants/StyleConstants'

const NotFound = memo(() => {
  const navigate = useNavigate()

  const handleGoHome = () => {
    navigate({ to: '/dashboard' })
  }

  const handleGoBack = () => {
    window.history.back()
  }

  return (
    <Box
      minH="100vh"
      bg={COLORS.neutral[50]}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Box maxW="md" mx="auto" textAlign="center" px={6}>
        <VStack gap={6}>
          {/* 404 Number */}
          <Box>
            <Heading
              fontSize={{ base: '6xl', md: '8xl' }}
              fontWeight="bold"
              color={COLORS.neutral[300]}
              lineHeight="1"
            >
              404
            </Heading>
          </Box>

          {/* Error Message */}
          <VStack gap={4}>
            <Heading
              fontSize={{ base: 'xl', md: '2xl' }}
              fontWeight="semibold"
              color={COLORS.neutral[800]}
            >
              Page Not Found
            </Heading>
            <Text
              fontSize="md"
              color={COLORS.text.secondary}
              maxW="sm"
              mx="auto"
            >
              Sorry, we couldn't find the page you're looking for. The page
              might have been moved, deleted, or you entered the wrong URL.
            </Text>
          </VStack>

          {/* Action Buttons */}
          <Flex
            direction={{ base: 'column', sm: 'row' }}
            gap={4}
            w="full"
            maxW="sm"
          >
            <Button
              leftIcon={<FiHome />}
              onClick={handleGoHome}
              variant="primary"
              size="md"
            >
              Go to Dashboard
            </Button>
            <Button
              leftIcon={<FiArrowLeft />}
              onClick={handleGoBack}
              variant="outline"
              size="md"
            >
              Go Back
            </Button>
          </Flex>

          {/* Additional Help */}
          <Box pt={4}>
            <Text fontSize="sm" color={COLORS.text.tertiary}>
              If you believe this is an error, please contact support.
            </Text>
          </Box>
        </VStack>
      </Box>
    </Box>
  )
})

NotFound.displayName = 'NotFound'

export default NotFound
