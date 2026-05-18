import { useEffect, useState } from 'react'
import { Box, Flex, Heading, Spinner, Text, VStack } from '@chakra-ui/react'
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/tabs'
import { useQueries, useUpdateQueryBookmark } from '../hooks'
import { QueryCard } from './QueryCard'
import type { Query } from '../types'
import Pagination from '@/features/shared/components/Pagination'
import { PageLayout } from '@/features/shared/layout/PageLayout'
import { COLORS, PER_PAGE } from '@/features/shared/constants'

const PAGE_SIZE = PER_PAGE

export const QueryManagement = () => {
  const [recentPage, setRecentPage] = useState(1)
  const [bookmarkPage, setBookmarkPage] = useState(1)
  const [selectedTab, setSelectedTab] = useState<number>(0)

  // Reset page when switching tabs
  useEffect(() => {
    if (selectedTab === 0) {
      setBookmarkPage(1)
    } else {
      setRecentPage(1)
    }
  }, [selectedTab])

  const { data: recentQueries, isLoading: isLoadingRecent } = useQueries(
    'recent',
    recentPage,
    PAGE_SIZE,
    {
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  )

  const { data: bookmarkedQueries, isLoading: isLoadingBookmarked } =
    useQueries('bookmark', bookmarkPage, PAGE_SIZE, {
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    })

  const updateBookmarkMutation = useUpdateQueryBookmark()

  const handleToggleBookmark = async (
    queryId: string,
    currentBookmarkState: boolean,
  ) => {
    await updateBookmarkMutation.mutate({
      queryId,
      isBookmark: !currentBookmarkState,
    })
  }

  const handleRerunQuery = (queryId: string) => {
    console.log(`Rerunning query ${queryId}`)
  }

  const renderQueries = (queries: Array<Query> = [], isLoading: boolean) => {
    if (isLoading) {
      return (
        <Flex justify="center" align="center" py={8}>
          <Spinner size="lg" color="blue.500" />
        </Flex>
      )
    }

    if (!queries.length) {
      return (
        <Box
          py={8}
          display={'flex'}
          alignItems={'center'}
          justifyContent={'center'}
          textAlign="center"
        >
          <Text color="gray.500">No queries found</Text>
        </Box>
      )
    }

    return queries.map((query) => {
      return (
        <QueryCard
          key={query.query_id}
          {...query}
          onRerunQuery={() => handleRerunQuery(query.query_id)}
          onToggleFavorite={() =>
            handleToggleBookmark(query.query_id, query.is_bookmark)
          }
        />
      )
    })
  }

  return (
    <PageLayout>
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Heading
            size="3xl"
            color={COLORS.text.primary}
            mb={1}
            fontWeight={'semibold'}
          >
            Query Management
          </Heading>
          <Text color={COLORS.text.secondary}>
            Manage your saved queries and search history
          </Text>
        </Box>
      </Flex>

      <Box borderRadius="md" py={6}>
        <Tabs
          index={selectedTab}
          onChange={setSelectedTab}
          variant="line"
          isLazy
        >
          <TabList
            gap={35}
            mb={5}
            borderBottom={'1px solid'}
            borderColor={'rgba(211, 211, 211, 1)'}
          >
            <Tab
              _selected={{
                color: 'blue',
                borderBottom: '2px solid',
                borderColor: 'purple.600',
                fontWeight: 'semibold',
              }}
              _hover={{
                cursor: 'pointer',
                opacity: '0.9',
              }}
              fontSize="large"
              pb={10}
            >
              Recent Queries
            </Tab>
            <Tab
              _selected={{
                color: 'blue',
                borderBottom: '2px solid',
                borderColor: 'purple.600',
                fontWeight: 'semibold',
              }}
              _hover={{
                cursor: 'pointer',
                opacity: '0.9',
              }}
              fontSize="large"
              pb={10}
            >
              Bookmarked
            </Tab>
          </TabList>
          <Box borderTop="1px" borderColor="gray.200" pt={6}>
            <TabPanels>
              <TabPanel px={0}>
                <VStack gap={4} align="stretch">
                  {renderQueries(recentQueries?.queries, isLoadingRecent)}
                  {recentQueries && recentQueries.total > 0 && (
                    <Box mt={8}>
                      <Pagination
                        currentPage={recentPage}
                        totalPages={Math.ceil(recentQueries.total / PAGE_SIZE)}
                        totalCount={recentQueries.total}
                        pageSize={PAGE_SIZE}
                        onPageChange={setRecentPage}
                      />
                    </Box>
                  )}
                </VStack>
              </TabPanel>
              <TabPanel px={0}>
                <VStack gap={4} align="stretch">
                  {renderQueries(
                    bookmarkedQueries?.queries,
                    isLoadingBookmarked,
                  )}
                  {bookmarkedQueries && bookmarkedQueries.total > 0 && (
                    <Box mt={8}>
                      <Pagination
                        currentPage={bookmarkPage}
                        totalPages={Math.ceil(
                          bookmarkedQueries.total / PAGE_SIZE,
                        )}
                        totalCount={bookmarkedQueries.total}
                        pageSize={PAGE_SIZE}
                        onPageChange={setBookmarkPage}
                      />
                    </Box>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Box>
        </Tabs>
      </Box>
    </PageLayout>
  )
}
