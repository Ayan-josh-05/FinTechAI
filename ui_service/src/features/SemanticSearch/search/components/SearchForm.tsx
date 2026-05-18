import { useCallback, useState } from 'react'
import { Box, Button, HStack, Text, Textarea, VStack } from '@chakra-ui/react'
import { FaArrowRight } from 'react-icons/fa'
import { useNavigate } from '@tanstack/react-router'
// import { useSearchSuggestionsDebounced } from '../hooks'
import { validateSearchQuery } from '../../utils'
import type { SemanticSearchFilters } from '../../types'

interface SearchFormProps {
  initialQuery?: string
  initialFilters?: SemanticSearchFilters
  onSearch?: (query: string, filters?: SemanticSearchFilters) => void
  placeholder?: string
  query?: string
  onQueryChange?: (query: string) => void
}

const SearchForm = ({
  initialQuery = '',
  initialFilters,
  onSearch,
  placeholder = 'Ask anything about law... e.g., "What are the essential elements of a valid contract under Indian Contract Act?"',
  query: externalQuery,
  onQueryChange,
}: SearchFormProps) => {
  const navigate = useNavigate()
  const [internalQuery, setInternalQuery] = useState(initialQuery)
  const query = externalQuery !== undefined ? externalQuery : internalQuery
  const [filters] = useState<SemanticSearchFilters>(initialFilters || {})
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // const { data: suggestions = [] } = useSearchSuggestionsDebounced(query)

  const handleSearch = useCallback(async () => {
    const validationError = validateSearchQuery(query)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)

    try {
      setIsSubmitting(true)

      if (onSearch) {
        await onSearch(query, filters)
      } else {
        const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        navigate({
          to: '/semantic-search/t/$id',
          params: { id: searchId },
          search: {
            ...filters,
          },
        })
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to perform semantic search. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [query, filters, onSearch, navigate])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSearch()
    }
  }

  // const handleSuggestionClick = (suggestion: string) => {
  //   setQuery(suggestion)
  //   handleSearch()
  // }

  return (
    <Box>
      <VStack gap={4} align="stretch">
        <Box
          bg="white"
          borderRadius="xl"
          boxShadow="lg"
          border="1px"
          borderColor="gray.200"
          p={1}
          _focusWithin={{
            borderColor: 'blue.400',
            boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.1)',
          }}
          transition="all 0.2s"
        >
          <VStack gap={0} align="stretch">
            <Textarea
              value={query}
              onChange={(e) => {
                const newValue = e.target.value
                if (onQueryChange) {
                  onQueryChange(newValue)
                } else {
                  setInternalQuery(newValue)
                }
              }}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              size="lg"
              aria-invalid={!!error}
              minH="140px"
              resize="vertical"
              fontSize="md"
              disabled={isSubmitting}
              border="none"
              _focus={{
                boxShadow: 'none',
                outline: 'none',
              }}
              _placeholder={{
                color: 'gray.400',
              }}
              p={4}
            />
            <HStack justify="end" p={3} pt={0}>
              <Button
                onClick={() => {
                  void handleSearch()
                }}
                colorScheme="blue"
                size="lg"
                disabled={!query.trim() || isSubmitting}
                loading={isSubmitting}
                loadingText="Searching..."
                px={8}
                borderRadius="lg"
                _hover={{
                  transform: 'translateY(-1px)',
                  boxShadow: 'md',
                }}
                transition="all 0.2s"
              >
                {isSubmitting ? "Searching..." : "Search"}
                {!isSubmitting && <FaArrowRight style={{ marginLeft: '8px' }} />}
              </Button>
            </HStack>
          </VStack>
        </Box>

        {error && (
          <Text color="red.500" fontSize="sm" px={2}>
            {error}
          </Text>
        )}

        {/* {suggestions.length > 0 && (
          <Box>
            <Text fontSize="sm" color="gray.600" mb={2}>
              Suggestions:
            </Text>
            <HStack gap={2} flexWrap="wrap">
              {suggestions.slice(0, 5).map((suggestion, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant="outline"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </HStack>
          </Box>
        )} */}
      </VStack>
    </Box>
  )
}

export default SearchForm
