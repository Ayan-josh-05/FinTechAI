import {
  Box,
  Grid,
  GridItem,
  Skeleton,
  SkeletonText,
  VStack,
} from '@chakra-ui/react'
import { getBreadcrumbItems } from '../constants/constants'
import EntityPageLayout from '@/features/shared/layout/EntityPageLayout'

import { COLORS } from '@/features/shared/constants/StyleConstants'
const JudgeDetailsSkeleton = ({ judgeId }: { judgeId: string }) => {
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
    <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
      {/* Left Column */}
      <Box display="flex" flexDirection="column" gap={6}>
        {/* Professional Background Skeleton */}
        <Box>
          <Skeleton height="32px" width="200px" mb={4} />
          <SkeletonText noOfLines={4} />
        </Box>

        {/* Areas of Specialization Skeleton */}
        <Box>
          <Skeleton height="32px" width="180px" mb={4} />
          <VStack gap={3} align="stretch">
            <Skeleton height="20px" width="150px" />
            <Skeleton height="20px" width="200px" />
            <Skeleton height="20px" width="120px" />
          </VStack>
        </Box>

        {/* Notable Judgments Skeleton */}
        <Box>
          <Skeleton height="32px" width="160px" mb={4} />
          <VStack gap={4} align="stretch">
            {[1, 2, 3].map((i) => (
              <Box
                key={i}
                p={4}
                border="1px solid"
                borderColor={COLORS.neutral[200]}
                borderRadius="md"
              >
                <Skeleton height="20px" width="200px" mb={2} />
                <SkeletonText noOfLines={2} />
              </Box>
            ))}
          </VStack>
        </Box>

        {/* Recent Hearings Skeleton */}
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
                <Skeleton height="16px" width="100px" />
              </Box>
            ))}
          </VStack>
        </Box>
      </Box>

      {/* Right Column */}
      <Box display="flex" flexDirection="column" gap={6}>
        {/* Case Statistics Skeleton */}
        <Box>
          <Skeleton height="32px" width="160px" mb={4} />
          <Grid templateColumns="1fr 1fr" gap={4}>
            {[1, 2, 3, 4].map((i) => (
              <GridItem key={i}>
                <Box
                  p={4}
                  border="1px solid"
                  borderColor={COLORS.neutral[200]}
                  borderRadius="md"
                >
                  <Skeleton height="20px" width="80px" mb={2} />
                  <Skeleton height="24px" width="60px" />
                </Box>
              </GridItem>
            ))}
          </Grid>
        </Box>

        {/* Case Distribution Skeleton */}
        <Box>
          <Skeleton height="32px" width="160px" mb={4} />
          <Box
            p={4}
            border="1px solid"
            borderColor={COLORS.neutral[200]}
            borderRadius="md"
          >
            <VStack gap={3} align="stretch">
              {[1, 2, 3].map((i) => (
                <Box
                  key={i}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Skeleton height="16px" width="100px" />
                  <Skeleton height="16px" width="40px" />
                </Box>
              ))}
            </VStack>
          </Box>
        </Box>
      </Box>
    </Grid>
  )

  return (
    <Box mb={8}>
      <EntityPageLayout
        children={skeletonLayoutChildrens}
        breadcrumbItems={getBreadcrumbItems(judgeId)}
        headerProps={skeletonHeaderProps}
      />
    </Box>
  )
}

export default JudgeDetailsSkeleton
