import { useMemo, useState, useEffect } from 'react'
import { Box, Flex, Text, VStack } from '@chakra-ui/react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { parseSearchUrl } from '../utils'
import SearchForm from '../search/components/SearchForm'
import SearchHistorySidebar from '../search/components/SearchHistorySidebar'
import SuggestedQueries from '../search/components/SuggestedQueries'
import type { SemanticSearchQuery } from '../types'
import { semanticSearchApi } from '../api'
import { useSemanticSearchStore } from '../store'

const SemanticSearch = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['semantic-search-history'] })
  }, [queryClient])

  // Parse search parameters from URL
  const { query, filters } = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search)
    return parseSearchUrl(urlParams)
  }, [])

  const { setCurrentQuestion, setCurrentChatId, setIsNewChat, clearChat } = useSemanticSearchStore()
  const [searchQuery, setSearchQuery] = useState( query || '')
  const [, setSearchParams] = useState<SemanticSearchQuery>({
    query: query || '',
    filters: filters || {},
    limit: 20,
    offset: 0,
  })

  const handleSearch = async (
    newQuery: string,
    newFilters?: SemanticSearchQuery['filters'],
  ) => {
    const updatedParams = {
      query: newQuery,
      filters: newFilters || {},
      limit: 20,
      offset: 0,
    }

    setSearchParams(updatedParams)

    const { chatId } = await semanticSearchApi.createSearchJob({
      query: newQuery,
      filters: newFilters,
    })

    // Clear any previous chat state before starting new search
    // This ensures we start with a clean slate
    clearChat()
    
    // Set up new chat state
    setCurrentQuestion(newQuery)
    setCurrentChatId(chatId)
    setIsNewChat(true)

    navigate({
      to: '/semantic-search/t/$id',
      params: { id: chatId },
      search: newFilters ? { ...newFilters } : {},
    })
  }

  const handleSuggestionClick = (suggestionText: string) => {
    setSearchQuery(suggestionText)
  }

  // Filters are not used on this page now

  // Results view removed from this page

  return (
    <Flex h="100vh" bg="gray.50">
      {/* Left Sidebar with collapsible history and quick filters */}
      <SearchHistorySidebar />

      {/* Main Content */}
      <Flex flex={1} direction="column">
        {/* Centered Search Section */}
        <Flex flex={1} align="center" justify="center" bg="gradient-to-b from-gray-50 to-white" direction="column" p={6}>
          <VStack gap={8} align="stretch" w="100%" maxW="900px">
            {/* Header Section */}
            <Box textAlign="center" pt={8}>
              <Text fontSize="4xl" fontWeight="bold" mb={3} color="gray.800">
                Legal Semantic Search
              </Text>
              <Text fontSize="lg" color="gray.600" maxW="700px" mx="auto">
                Ask questions in natural language and discover intelligent
                insights from comprehensive legal databases
              </Text>
            </Box>

            {/* Search Form */}
            <SearchForm
              initialQuery={searchQuery}
              initialFilters={filters}
              onSearch={handleSearch}
              query={searchQuery}
              onQueryChange={setSearchQuery}
            />

            {/* Suggested Queries */}
            <Box pt={4}>
              <SuggestedQueries onSuggestionClick={handleSuggestionClick} />
            </Box>
          </VStack>
        </Flex>
      </Flex>
    </Flex>
  )
}

export default SemanticSearch
