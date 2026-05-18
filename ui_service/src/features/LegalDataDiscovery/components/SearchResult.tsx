import { memo } from 'react'
import { Box, Flex, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { FiAlertCircle, FiInbox, FiSearch } from 'react-icons/fi'
import { PER_PAGE, SORT_OPTIONS, TEXT_CONTENT } from '../constants'
import SearchResultCard from './SearchResultCard'
import type { SearchResult } from '../types'
import { Card, Pagination } from '@/features/shared/components'
import SelectComponent from '@/features/shared/components/Select'
import { COLORS } from '@/features/shared/constants/StyleConstants'

interface SearchResultsProps {
  results: Array<SearchResult>
  onSortChange: (sortBy: string) => void
  onPageChange: (page: number) => void
  onHelpClick: (resultId: string) => void
  onClearSearch: () => void
  totalResults: number
  currentPage: number
  isLoading: boolean
  hasSearched: boolean
  error?: Error
  sortBy?: string
}

const SearchResults = memo(
  ({
    results,
    onSortChange,
    onPageChange,
    onHelpClick,
    onClearSearch,
    totalResults,
    currentPage,
    isLoading,
    hasSearched,
    error,
    sortBy = 'date',
  }: SearchResultsProps) => {
    const { searchResults } = TEXT_CONTENT

    // Debug logging
    console.log('SearchResults props:', {
      resultsLength: results.length,
      totalResults,
      isLoading,
      hasSearched,
      error: error?.message,
      results: results.slice(0, 2), // Log first 2 results
    })

    // Show message when user hasn't searched anything
    if (!hasSearched) {
      return (
        <Card
          variant="elevated"
          bg="transparent"
          boxShadow="none"
          border="none"
        >
          <VStack gap={4} py={12} textAlign="center">
            <Icon as={FiSearch} boxSize={16} color={COLORS.text.disabled} />
            <Text
              fontSize="lg"
              fontWeight="medium"
              color={COLORS.text.secondary}
            >
              Start your legal data discovery
            </Text>
            <Text fontSize="sm" color={COLORS.text.tertiary} maxW="md">
              Use the search form above to explore case data, legal documents,
              and precedents
            </Text>
          </VStack>
        </Card>
      )
    }

    // Show loading state when search is in progress
    if (isLoading) {
      return (
        <Card
          variant="elevated"
          bg="transparent"
          boxShadow="none"
          border="none"
        >
          <VStack gap={4} py={12} textAlign="center">
            <Box
              className="animate-spin"
              border="4px solid"
              borderColor={COLORS.neutral[200]}
              borderTopColor={COLORS.primary[500]}
              borderRadius="full"
              boxSize={16}
            />
            <Text
              fontSize="lg"
              fontWeight="medium"
              color={COLORS.text.secondary}
            >
              Searching...
            </Text>
            <Text fontSize="sm" color={COLORS.text.tertiary} maxW="md">
              Please wait while we search through legal data
            </Text>
          </VStack>
        </Card>
      )
    }

    // Show message when no results found (only after loading is complete)
    if (results.length === 0) {
      return (
        <Card
          variant="elevated"
          bg="transparent"
          boxShadow="none"
          border="none"
        >
          <VStack gap={4} py={12} textAlign="center">
            <Icon as={FiInbox} boxSize={16} color={COLORS.text.disabled} />
            <Text
              fontSize="lg"
              fontWeight="medium"
              color={COLORS.text.secondary}
            >
              No results found
            </Text>
            <Text fontSize="sm" color={COLORS.text.tertiary} maxW="md">
              Try adjusting your search criteria or filters to find relevant
              results
            </Text>
          </VStack>
        </Card>
      )
    }

    // Show error state
    if (error) {
      return (
        <Card
          variant="elevated"
          bg="transparent"
          boxShadow="none"
          border="none"
        >
          <VStack gap={4} py={12} textAlign="center">
            <Icon as={FiAlertCircle} boxSize={16} color={COLORS.error[400]} />
            <Box
              bg={COLORS.error[50]}
              border="1px"
              borderColor={COLORS.error[200]}
              borderRadius="md"
              p={4}
              w="full"
              maxW="md"
            >
              <Text fontSize="lg" fontWeight="medium" color={COLORS.error[600]}>
                Error loading search results
              </Text>
              <Text fontSize="sm" color={COLORS.error[500]} mt={2}>
                {error.message ||
                  'An unexpected error occurred. Please try again.'}
              </Text>
            </Box>
            <Box
              as="button"
              px={4}
              py={2}
              fontSize="sm"
              fontWeight="medium"
              color={COLORS.text.secondary}
              bg={COLORS.neutral[100]}
              borderRadius="md"
              _hover={{ bg: 'gray.200' }}
              onClick={onClearSearch}
            >
              Clear Search
            </Box>
          </VStack>
        </Card>
      )
    }

    return (
      <Card variant="elevated" bg="transparent" boxShadow="none" border="none">
        <Box>
          {/* Header */}
          <Flex
            align="center"
            justify="space-between"
            borderBottom="1px"
            borderColor={COLORS.neutral[100]}
            pb={4}
            mb={3}
          >
            <Text fontSize="xl" fontWeight="bold" color={COLORS.neutral[800]}>
              {searchResults.title}
            </Text>
            <HStack gap={6}>
              <Text
                fontSize="sm"
                color={COLORS.text.secondary}
                whiteSpace="nowrap"
              >
                {totalResults} results found
              </Text>
              <Box minW="200px">
                <SelectComponent
                  label=""
                  value={sortBy}
                  options={SORT_OPTIONS}
                  placeholder="Sort by"
                  onChange={onSortChange}
                  bgColor={COLORS.neutral[100]}
                  showClearButton={false}
                />
              </Box>
              <Box
                as="button"
                px={3}
                py={2}
                fontSize="sm"
                fontWeight="medium"
                color={COLORS.text.secondary}
                bg={COLORS.neutral[100]}
                borderRadius="md"
                _hover={{ bg: 'gray.200' }}
                onClick={onClearSearch}
              >
                Clear Search
              </Box>
            </HStack>
          </Flex>

          {/* Results */}
          <Box>
            {results.map((result) => (
              <SearchResultCard
                key={result.id}
                result={result}
                onHelpClick={onHelpClick}
              />
            ))}
          </Box>

          {/* Pagination */}
          {totalResults > 0 && (
            <Flex
              align="center"
              justify="space-between"
              borderTop="1px"
              borderColor={COLORS.neutral[100]}
              pl={1}
              pr={1}
            >
              <Text fontSize="sm" color={COLORS.text.secondary}>
                Showing {(currentPage - 1) * PER_PAGE + 1} to{' '}
                {Math.min(currentPage * PER_PAGE, totalResults)} of{' '}
                {totalResults} results
              </Text>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalResults / PER_PAGE)}
                onPageChange={onPageChange}
                size="sm"
                totalCount={totalResults}
                pageSize={PER_PAGE}
              />
            </Flex>
          )}
        </Box>
      </Card>
    )
  },
)

SearchResults.displayName = 'SearchResults'

export default SearchResults
