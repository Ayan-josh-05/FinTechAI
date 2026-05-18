import { Box, VStack } from '@chakra-ui/react'

import { PageLayout } from './PageLayout'
import { Breadcrumb, EntityHeader } from '@/features/shared/components'

import { COLORS } from '@/features/shared/constants/StyleConstants'

const EntityPageLayout = (props: any) => {
  const { breadcrumbItems, headerProps, children } = props
  const { title, statusBadges, actions, infoItems, image } = headerProps
  return (
    <Box minH="100vh" bg={COLORS.neutral[50]}>
      <Box
        w="100%"
        bg="white"
        borderBottom="1px"
        borderColor={COLORS.neutral[200]}
        mb={4}
        mt={2}
      >
        <Box w="100%" px={8}>
          <Box w="100%" py={2}>
            <Breadcrumb items={breadcrumbItems} />
          </Box>
        </Box>
      </Box>

      <PageLayout>
        <VStack gap={6} align="stretch">
          {/* Entity Header */}
          <EntityHeader
            title={title}
            statusBadges={statusBadges}
            actions={actions}
            infoItems={infoItems}
            variant="elevated"
            image={image}
          />

          {children}
        </VStack>
      </PageLayout>
    </Box>
  )
}

export default EntityPageLayout
