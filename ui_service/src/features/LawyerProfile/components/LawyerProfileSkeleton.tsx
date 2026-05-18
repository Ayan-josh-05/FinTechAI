import {
  Box,
  Container,
  Grid,
  Skeleton,
  SkeletonText,
  VStack,
} from '@chakra-ui/react'
import { getBreadcrumbItems } from '../constants/constants'
import EntityPageLayout from '@/features/shared/layout/EntityPageLayout'

import { COLORS } from '@/features/shared/constants/StyleConstants'
const LawyerProfileSkeleton = ({ lawyerId }: { lawyerId: string }) => {
  // Skeleton header props
  const skeletonHeaderProps = {
    infoItems: [
      {
        label: '',
        value: <Skeleton height="20px" width="120px" />,
      },
      {
        label: '',
        value: <Skeleton height="20px" width="100px" />,
      },
      { label: '', value: <Skeleton height="20px" width="80px" /> },
    ],
    statusBadges: [],
    title: <Skeleton height="32px" width="300px" />,
    actions: [],
  }

  const skeletonLayoutChildrens = (
    <Container maxW="10xl" p={0}>
      <Box display="flex" flexDirection="column" gap={6}>
        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
          {/* Left Column */}
          <Box display="flex" flexDirection="column" gap={6}>
            {/* Areas of Practice Skeleton */}
            <Box>
              <Skeleton height="32px" width="180px" mb={4} />
              <VStack gap={3} align="stretch">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton
                    key={i}
                    height="20px"
                    width={`${Math.random() * 200 + 100}px`}
                  />
                ))}
              </VStack>
            </Box>

            {/* Recent Cases Skeleton */}
            <Box>
              <Skeleton height="32px" width="160px" mb={4} />
              <VStack gap={4} align="stretch">
                {[1, 2, 3, 4].map((i) => (
                  <Box
                    key={i}
                    p={4}
                    border="1px solid"
                    borderColor={COLORS.neutral[200]}
                    borderRadius="md"
                  >
                    <Skeleton height="20px" width="200px" mb={2} />
                    <SkeletonText noOfLines={2} />
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mt={2}
                    >
                      <Skeleton height="16px" width="120px" />
                      <Skeleton height="16px" width="80px" />
                    </Box>
                  </Box>
                ))}
              </VStack>
            </Box>
          </Box>

          {/* Right Column */}
          <Box display="flex" flexDirection="column" gap={6}>
            {/* Associated Courts Skeleton */}
            <Box>
              <Skeleton height="32px" width="160px" mb={4} />
              <VStack gap={3} align="stretch">
                {[1, 2, 3, 4].map((i) => (
                  <Box
                    key={i}
                    p={3}
                    border="1px solid"
                    borderColor={COLORS.neutral[200]}
                    borderRadius="md"
                  >
                    <Skeleton height="20px" width="150px" mb={2} />
                    <Skeleton height="16px" width="100px" />
                  </Box>
                ))}
              </VStack>
            </Box>

            {/* Professional Stats Skeleton */}
            <Box>
              <Skeleton height="32px" width="160px" mb={4} />
              <Grid templateColumns="1fr 1fr" gap={4}>
                {[1, 2, 3, 4].map((i) => (
                  <Box
                    key={i}
                    p={4}
                    border="1px solid"
                    borderColor={COLORS.neutral[200]}
                    borderRadius="md"
                  >
                    <Skeleton height="20px" width="80px" mb={2} />
                    <Skeleton height="24px" width="60px" />
                  </Box>
                ))}
              </Grid>
            </Box>
          </Box>
        </Grid>
      </Box>
    </Container>
  )

  return (
    <Box mb={8}>
      <EntityPageLayout
        children={skeletonLayoutChildrens}
        breadcrumbItems={getBreadcrumbItems(lawyerId)}
        headerProps={skeletonHeaderProps}
      />
    </Box>
  )
}

export default LawyerProfileSkeleton
