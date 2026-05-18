import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  HStack,
  IconButton,
  Text,
  VStack,
} from '@chakra-ui/react'
import { MdPlayArrow } from 'react-icons/md'
import { FaBookmark, FaRegBookmark } from 'react-icons/fa6'
import { useNavigate } from '@tanstack/react-router'
import { formatTitle } from '../utils/formatters'
import { COLORS } from '@/features/shared/constants/StyleConstants'

interface QueryCardProps {
  query_id: string
  search_query: {
    type: string
    fields: Record<string, any>
  }
  total_results: number | null
  updated_at: string
  last_search: string
  is_bookmark: boolean
  onRerunQuery?: () => void
  onToggleFavorite?: () => void
}

export const QueryCard = ({
  search_query,
  query_id,
  total_results,
  last_search,
  is_bookmark = false,
  onToggleFavorite,
}: QueryCardProps) => {
  const navigate = useNavigate()

  const handleRerun = () => {
    navigate({
      to: '/legal-data-discovery',
      search: { query_id },
    })
  }

  return (
    <Box
      bg="white"
      p={4}
      borderRadius="md"
      border="1px solid"
      borderColor={COLORS.neutral[200]}
      _hover={{
        boxShadow: 'md',
        borderColor: COLORS.neutral[300],
      }}
      transition="all 0.2s"
    >
      <Flex mb={3}>
        <VStack align="start" flex={1} gap={2}>
          <HStack gap={2}>
            <Text fontSize="lg" fontWeight="medium" color="gray.900">
              {formatTitle(search_query.type)}
            </Text>
          </HStack>

          <Grid
            templateColumns="repeat(auto-fill, minmax(250px, 1fr))"
            gap={3}
            w="100%"
          >
            {Object.entries(search_query.fields)
              .flatMap(([key, value]) => {
                // Handle both nested and direct fields
                if (typeof value === 'object' && value !== null) {
                  return Object.entries(value).filter(([_, val]) => val != null)
                }
                // Include direct fields
                return value != null ? [[key, value]] : []
              })
              .map(([fieldKey, fieldValue]) => {
                const formattedKey = fieldKey
                  .split('_')
                  .map(
                    (word: string) =>
                      word.charAt(0).toUpperCase() + word.slice(1),
                  )
                  .join(' ')

                return (
                  <GridItem key={fieldKey}>
                    <HStack align="start" gap={1}>
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        color="gray.700"
                      >
                        {formattedKey}:
                      </Text>
                      <Text fontSize="sm" color="gray.600" truncate>
                        {String(fieldValue)}
                      </Text>
                    </HStack>
                  </GridItem>
                )
              })}
          </Grid>
        </VStack>

        <Box>
          <IconButton
            aria-label={
              is_bookmark ? 'Remove from bookmarks' : 'Add to bookmarks'
            }
            variant="ghost"
            size="sm"
            color={is_bookmark ? 'yellow.500' : 'gray.500'}
            _hover={{ bg: 'gray.100' }}
            onClick={onToggleFavorite}
          >
            {is_bookmark ? <FaBookmark /> : <FaRegBookmark />}
          </IconButton>
        </Box>
      </Flex>

      <HStack justify="space-between" mb={3}>
        <HStack gap={4} fontSize="sm" color="gray.500">
          <Text>Last run: {last_search}</Text>
          <Text>Results: {total_results ?? 'N/A'}</Text>
        </HStack>
      </HStack>

      <HStack
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        pt={1}
      >
        <Box display={'flex'} gap={2}>
          <Button
            bg={COLORS.primary[500]}
            color="white"
            _hover={{ bg: COLORS.primary[600] }}
            size="sm"
            onClick={handleRerun}
          >
            <MdPlayArrow />
            Re-run Query
          </Button>
        </Box>
      </HStack>
    </Box>
  )
}
