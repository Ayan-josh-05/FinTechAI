import {
  Box,
  Grid,
  GridItem,
  Skeleton,
  SkeletonText,
  VStack,
} from '@chakra-ui/react'
import { getBreadcrumbItems } from '../constants'
import EntityPageLayout from '@/features/shared/layout/EntityPageLayout'

import { COLORS } from '@/features/shared/constants/StyleConstants'
const CaseDetailsSkeleton = ({ caseId }: { caseId: string }) => {
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
    <>
      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
        {/* Left Column */}
        <GridItem>
          <VStack gap={6} align="stretch">
            {/* Case Overview Skeleton */}
            <Box>
              <Skeleton height="32px" width="200px" mb={4} />
              <SkeletonText noOfLines={4} />
            </Box>

            {/* Involved Parties Skeleton */}
            <Box>
              <Skeleton height="32px" width="180px" mb={4} />
              <VStack gap={4} align="stretch">
                <Box
                  p={4}
                  border="1px solid"
                  borderColor={COLORS.neutral[200]}
                  borderRadius="md"
                >
                  <Skeleton height="24px" width="150px" mb={2} />
                  <Skeleton height="20px" width="200px" mb={2} />
                  <Skeleton height="20px" width="120px" />
                </Box>
                <Box
                  p={4}
                  border="1px solid"
                  borderColor={COLORS.neutral[200]}
                  borderRadius="md"
                >
                  <Skeleton height="24px" width="150px" mb={2} />
                  <Skeleton height="20px" width="200px" mb={2} />
                  <Skeleton height="20px" width="120px" />
                </Box>
              </VStack>
            </Box>

            {/* Financial Summary Skeleton */}
            <Box>
              <Skeleton height="32px" width="180px" mb={4} />
              <SkeletonText noOfLines={3} />
            </Box>

            {/* Involved Lawyers Skeleton */}
            <Box>
              <Skeleton height="32px" width="180px" mb={4} />
              <VStack gap={4} align="stretch">
                <Box
                  p={4}
                  border="1px solid"
                  borderColor={COLORS.neutral[200]}
                  borderRadius="md"
                >
                  <Skeleton height="24px" width="150px" mb={2} />
                  <Skeleton height="20px" width="200px" mb={2} />
                  <Skeleton height="20px" width="120px" />
                </Box>
              </VStack>
            </Box>

            {/* Case Timeline Skeleton */}
            <Box>
              <Skeleton height="32px" width="160px" mb={4} />
              <VStack gap={3} align="stretch">
                {[1, 2, 3, 4].map((i) => (
                  <Box key={i} display="flex" gap={4}>
                    <Skeleton
                      height="40px"
                      width="40px"
                      borderRadius="full"
                      flexShrink={0}
                    />
                    <Box flex={1}>
                      <Skeleton height="20px" width="150px" mb={2} />
                      <SkeletonText noOfLines={2} />
                    </Box>
                  </Box>
                ))}
              </VStack>
            </Box>
          </VStack>
        </GridItem>

        {/* Right Column */}
        <GridItem>
          <VStack gap={6} align="stretch">
            {/* Court Information Skeleton */}
            <Box>
              <Skeleton height="32px" width="180px" mb={4} />
              <Box
                p={4}
                border="1px solid"
                borderColor={COLORS.neutral[200]}
                borderRadius="md"
              >
                <VStack gap={3} align="stretch">
                  <Skeleton height="20px" width="200px" />
                  <Skeleton height="20px" width="180px" />
                  <Skeleton height="20px" width="150px" />
                  <Skeleton height="20px" width="160px" />
                </VStack>
              </Box>
            </Box>

            {/* Current Status Skeleton */}
            <Box>
              <Skeleton height="32px" width="160px" mb={4} />
              <Box
                p={4}
                border="1px solid"
                borderColor={COLORS.neutral[200]}
                borderRadius="md"
              >
                <VStack gap={3} align="stretch">
                  <Skeleton height="20px" width="150px" />
                  <Skeleton height="20px" width="180px" />
                  <Skeleton height="20px" width="140px" />
                  <Skeleton height="20px" width="160px" />
                </VStack>
              </Box>
            </Box>

            {/* Legal Sections Skeleton */}
            <Box>
              <Skeleton height="32px" width="180px" mb={4} />
              <VStack gap={3} align="stretch">
                <Box
                  p={4}
                  border="1px solid"
                  borderColor={COLORS.neutral[200]}
                  borderRadius="md"
                >
                  <Skeleton height="24px" width="200px" mb={3} />
                  <VStack gap={2} align="stretch">
                    <Skeleton height="16px" width="250px" />
                    <Skeleton height="16px" width="220px" />
                    <Skeleton height="16px" width="240px" />
                  </VStack>
                </Box>
                <Box
                  p={4}
                  border="1px solid"
                  borderColor={COLORS.neutral[200]}
                  borderRadius="md"
                >
                  <Skeleton height="24px" width="180px" mb={3} />
                  <VStack gap={2} align="stretch">
                    <Skeleton height="16px" width="200px" />
                    <Skeleton height="16px" width="180px" />
                  </VStack>
                </Box>
              </VStack>
            </Box>

            {/* Case Documents Skeleton */}
            <Box>
              <Skeleton height="32px" width="160px" mb={4} />
              <VStack gap={3} align="stretch">
                {[1, 2, 3].map((i) => (
                  <Box
                    key={i}
                    p={3}
                    border="1px solid"
                    borderColor={COLORS.neutral[200]}
                    borderRadius="md"
                  >
                    <Skeleton height="20px" width="150px" mb={2} />
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Skeleton height="16px" width="80px" />
                      <Skeleton height="16px" width="60px" />
                    </Box>
                  </Box>
                ))}
              </VStack>
            </Box>
          </VStack>
        </GridItem>
      </Grid>
    </>
  )

  return (
    <Box mb={8}>
      <EntityPageLayout
        children={skeletonLayoutChildrens}
        breadcrumbItems={getBreadcrumbItems(caseId)}
        headerProps={skeletonHeaderProps}
      />
    </Box>
  )
}

export default CaseDetailsSkeleton
