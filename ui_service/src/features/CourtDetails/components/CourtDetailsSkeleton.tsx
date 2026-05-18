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
const CourtDetailsSkeleton = ({ courtId }: { courtId: string }) => {
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
      {/* Court Overview Skeleton */}
      <Box>
        <Skeleton height="32px" width="200px" mb={4} />
        <SkeletonText noOfLines={4} />
      </Box>

      {/* Judges Roster Skeleton */}
      <Box>
        <Skeleton height="32px" width="180px" mb={4} />
        <Grid
          templateColumns={{ base: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }}
          gap={4}
        >
          {[1, 2, 3].map((i) => (
            <GridItem key={i}>
              <Box
                p={4}
                border="1px solid"
                borderColor={COLORS.neutral[200]}
                borderRadius="md"
              >
                <Skeleton height="24px" width="150px" mb={2} />
                <Skeleton height="20px" width="120px" mb={2} />
                <Skeleton height="16px" width="100px" mb={2} />
                <Skeleton height="16px" width="80px" />
              </Box>
            </GridItem>
          ))}
        </Grid>
      </Box>

      {/* Case Statistics Skeleton */}
      <Box>
        <Skeleton height="32px" width="160px" mb={4} />
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={4}>
          {[1, 2, 3].map((i) => (
            <GridItem key={i}>
              <Box
                p={4}
                border="1px solid"
                borderColor={COLORS.neutral[200]}
                borderRadius="md"
              >
                <Skeleton height="20px" width="100px" mb={2} />
                <Skeleton height="32px" width="80px" />
              </Box>
            </GridItem>
          ))}
        </Grid>
      </Box>

      {/* Court Location Skeleton */}
      <Box>
        <Skeleton height="32px" width="160px" mb={4} />
        <Box p={4} border="1px solid" borderColor={COLORS.neutral[200]} borderRadius="md">
          <VStack gap={3} align="stretch">
            <Skeleton height="20px" width="200px" />
            <Skeleton height="20px" width="180px" />
            <Skeleton height="20px" width="160px" />
            <Skeleton height="20px" width="140px" />
          </VStack>
        </Box>
      </Box>
    </>
  )

  return (
    <Box mb={8}>
      <EntityPageLayout
        children={skeletonLayoutChildrens}
        breadcrumbItems={getBreadcrumbItems(courtId)}
        headerProps={skeletonHeaderProps}
      />
    </Box>
  )
}

export default CourtDetailsSkeleton
