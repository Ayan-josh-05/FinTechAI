import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Text, 
  VStack,
  Spinner,
} from '@chakra-ui/react'
import {
  FaTrash,
} from 'react-icons/fa'
import { FaRegPenToSquare } from "react-icons/fa6";
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useInfiniteSearchHistory } from '@/features/SemanticSearch/hooks'
import { semanticSearchApi } from '@/features/SemanticSearch/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastNotifications } from '@/features/shared/components/ToastNotifications'

const truncatePrompt = (text: string | undefined | null, maxLength: number = 80): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

const SearchHistorySidebar = () => {
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; jobId: string; query: string }>({
    isOpen: false,
    jobId: '',
    query: ''
  })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const location = useLocation()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Use infinite query hook
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteSearchHistory(10)

  // Check if user is currently viewing a search result page
  const getCurrentlyViewedId = () => {
    const path = location.pathname;
    const match = path.match(/\/semantic-search\/t\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const currentlyViewedId = getCurrentlyViewedId();

  // Flatten all pages into a single array
  const allHistoryItems = data?.pages.flatMap((page: any) => page.results) ?? []

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => semanticSearchApi.deleteSearchHistory(jobId),
    onSuccess: (_, deletedJobId) => {
      const currentlyViewedId = getCurrentlyViewedId();
      const isViewingDeletedQuery = currentlyViewedId === deletedJobId;

      // Invalidate both regular and infinite query caches
      queryClient.invalidateQueries({ queryKey: ['semantic-search-history'] });
      queryClient.invalidateQueries({ queryKey: ['semantic-search-history-infinite'] });
      
      if (isViewingDeletedQuery) {
        navigate({ to: '/semantic-search' });
      }

      ToastNotifications.success({
        title: 'Removed from your search history',
        description: 'Search history item has been deleted successfully!',
      });
    },
    onError: (error) => {
      console.error('Failed to delete search history:', error);
      ToastNotifications.error({
        title: 'Deletion Failed',
        description: 'Failed to delete search history item. Please try again.',
      });
    },
  });

  const handleDeleteClick = (e: React.MouseEvent, jobId: string, query: string) => {
    e.stopPropagation();
    setConfirmDelete({
      isOpen: true,
      jobId,
      query
    });
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate(confirmDelete.jobId);
    setConfirmDelete({ isOpen: false, jobId: '', query: '' });
  };

  const handleCancelDelete = () => {
    setConfirmDelete({ isOpen: false, jobId: '', query: '' });
  };

  // Scroll handler to detect when user reaches bottom
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollThreshold = 100; // Trigger when within 100px of bottom
    
    if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Attach scroll listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <Flex h="100%" flexShrink={0}>
      <Box
        w={'320px'}
        bg="white"
        transition="width 0.2s ease"
        display="flex"
        flexDirection="column"
        h="100vh"
      >
        <VStack gap={4} align="stretch" flex="1" overflow="hidden">
            <>
              {/* New Search Button */}
              <HStack alignItems={"center"} onClick={() => navigate({ to: '/semantic-search' })} mt={4} mx={2} px={2} py={3} borderRadius="md" 
                _hover={{
                  bg: 'gray.100',
                  cursor: 'pointer',
                }}>
                <FaRegPenToSquare />
                <Text>New Search</Text>
              </HStack>
              {/* Header */}
              <HStack px={4} fontWeight={"medium"} color={"gray.500"}>
                <Text>Your Chats</Text>
              </HStack>
            
              {/* Search History Items with Infinite Scroll */}
              <Box 
                ref={scrollContainerRef}
                flex="1" 
                overflowY="auto" 
                px={2}
              >
                <VStack gap={3} align="stretch" pb={2}>
                  {isLoading ? (
                    <Box textAlign="center" py={8}>
                      <Spinner size="md" color="blue.500" />
                      <Text fontSize="sm" color="gray.500" mt={2}>
                        Loading your chats...
                      </Text>
                    </Box>
                  ) : allHistoryItems.length > 0 ? (
                    <>
                      {allHistoryItems.map((item) => {
                        const isActive = currentlyViewedId === item.id;
                        return (
                          <Box
                            key={item.id}
                            p={3}
                            border="1px"
                            borderColor={isActive ? "blue.500" : "gray.200"}
                            borderRadius="md"
                            bg={isActive ? "blue.50" : "gray.50"}
                            _hover={{ 
                              bg: isActive ? 'blue.100' : 'gray.100',
                              '& .delete-button': {
                                opacity: 1,
                                visibility: 'visible'
                              }
                            }}
                            cursor="pointer"
                            onClick={() => {
                              navigate({
                                to: '/semantic-search/t/$id',
                                params: { id: item.id },
                                search: {
                                  fromHistory: true,
                                },
                              })
                            }}
                            position="relative"
                            _before={isActive ? {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '3px',
                              bg: 'blue.500',
                              borderRadius: 'md 0 0 md'
                            } : undefined}
                          >
                            <VStack align="stretch" gap={2}>
                              <HStack justify="space-between" align="center">
                                <Text 
                                  fontSize="sm" 
                                  fontWeight="medium" 
                                  flex="1"
                                  pr={2}
                                  title={item.title || ''}
                                >
                                  {truncatePrompt(item.title) || 'Untitled Chat'}
                                </Text>
                                <IconButton
                                  className="delete-button"
                                  aria-label="Delete search history item"
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={(e) => handleDeleteClick(e, item.id, item.title || '')}
                                  disabled={deleteMutation.isPending}
                                  _hover={{ bg: 'red.100' }}
                                  opacity={0}
                                  visibility="hidden"
                                  transition="all 0.2s ease"
                                >
                                  <FaTrash />
                                </IconButton>
                              </HStack>
                            </VStack>
                          </Box>
                        );
                      })}
                      
                      {/* Loading indicator for next page */}
                      {isFetchingNextPage && (
                        <Box textAlign="center" py={4}>
                          <Spinner size="sm" color="blue.500" />
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            Loading more...
                          </Text>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Box textAlign="center" py={8}>
                      <Text fontSize="sm" color="gray.500">
                        No search history yet
                      </Text>
                      <Text fontSize="xs" color="gray.400" mt={1}>
                        Your searches will appear here
                      </Text>
                    </Box>
                  )}
                </VStack>
              </Box>
            </>
        </VStack>
      </Box>
      <Box w="1px" bg="gray.400" flexShrink={0} />

      {/* Confirmation Modal */}
      {confirmDelete.isOpen && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(0, 0, 0, 0.5)"
          zIndex="modal"
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={handleCancelDelete}
        >
          <Box
            bg="white"
            p={6}
            borderRadius="lg"
            boxShadow="lg"
            maxW="400px"
            w="90%"
            onClick={(e) => e.stopPropagation()}
          >
            <VStack gap={4} align="stretch">
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                Delete Search History?
              </Text>
              <Text fontSize="sm" color="gray.600">
                Are you sure you want to delete this search history item? This action cannot be undone.
              </Text>
              <Text fontSize="xs" color="gray.500" bg="gray.50" p={2} borderRadius="md">
                "{truncatePrompt(confirmDelete.query, 120)}"
              </Text>
              <HStack gap={2} justify="flex-end">
                <Button
                  variant="ghost"
                  onClick={handleCancelDelete}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  bgColor={"red"}
                  _hover={{bg: "red.600"}}
                  onClick={handleConfirmDelete}
                  loading={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}
    </Flex>
  )
}

export default SearchHistorySidebar
