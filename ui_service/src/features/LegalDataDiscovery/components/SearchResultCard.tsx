import { Box, Flex, HStack, Link, Text } from '@chakra-ui/react'
import { FiDownload, FiEye } from 'react-icons/fi'
import { useSearch } from '@tanstack/react-router'
import { RISK_LABEL_MAP, TEXT_CONTENT } from '../constants'
import type { SearchResult } from '../types'
import { Badge, Card } from '@/features/shared/components'
import { isEmptyObject, isEmptyValue } from '@/utils/objectUtils'

import { COLORS } from '@/features/shared/constants/StyleConstants'

interface SearchResultCardProps {
  result: SearchResult
  onHelpClick: (resultId: string) => void
}

const SearchResultCard = ({ result }: SearchResultCardProps) => {
  const { searchResults } = TEXT_CONTENT
  const search = useSearch({ from: '/legal-data-discovery' })

  const getRiskLabel = (risk: string) => {
    return RISK_LABEL_MAP[risk as keyof typeof RISK_LABEL_MAP] || 'N/A'
  }

  const getRiskScoreColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'red.500'
      case 'medium':
        return 'orange.500'
      case 'low':
        return 'green.500'
      default:
        return 'gray.500'
    }
  }

  return (
    <Card
      p={6}
      variant="outline"
      _hover={{ shadow: 'md' }}
      transition="all 0.2s"
      mb={4}
      borderColor={COLORS.neutral[200]}
      width="100%"
    >
      {/* Header with title and badges */}
      <Flex align="center" justify="space-between" mb={4} mr={4}>
        <Text fontWeight="bold" color={COLORS.neutral[800]} fontSize="lg">
          {result.id} - {result.type}
        </Text>

        <HStack gap={2}>
        <Badge
            items={[
              {
                text: result.cnr_number ? "CNR No.: " + result.cnr_number : "N/A",
                type: 'review'
              },
            ]}
          />
          <Badge
            items={[
              {
                text: getRiskLabel(result.risk),
                type: result.risk,
              },
            ]}
          />
          <Badge
            items={[
              {
                text: result.status,
                type: result.status.toLowerCase().includes('active')
                  ? 'active'
                  : result.status.toLowerCase().includes('review')
                    ? 'review'
                    : 'inactive',
              },
            ]}
          />
        </HStack>
      </Flex>

      {/* Metadata Grid */}
      <Box mb={4}>
        <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
          <Box>
            <Text fontSize="sm" color={COLORS.text.secondary}>
              <Text as="span" fontWeight="semibold" color={COLORS.neutral[700]}>
                {searchResults.courtLabel}
              </Text>{' '}
              {isEmptyValue(result.court) || isEmptyObject(result.courtData) ? (
                '-'
              ) : result.courtData ? (
                <Link
                  color={COLORS.primary[600]}
                  fontWeight="medium"
                  _hover={{ textDecoration: 'underline' }}
                  href={`/court-details/${result.courtData.court_id}?${new URLSearchParams(
                    {
                      ...(search.query_id && {
                        query_id: search.query_id,
                      }),
                      ...(search.dateFrom && { dateFrom: search.dateFrom }),
                      ...(search.dateTo && { dateTo: search.dateTo }),
                      ...(search.riskScore && { riskScore: search.riskScore }),
                    },
                  ).toString()}`}
                >
                  {result.court}
                </Link>
              ) : (
                result.court
              )}
            </Text>
          </Box>
          <Box>
            <Text fontSize="sm" color={COLORS.text.secondary}>
              <Text as="span" fontWeight="semibold" color={COLORS.neutral[700]}>
                {searchResults.judgeLabel}
              </Text>{' '}
              {isEmptyValue(result.judge) || isEmptyObject(result.judgeData) ? (
                '-'
              ) : result.judgeData ? (
                <Link
                  color={COLORS.primary[600]}
                  fontWeight="medium"
                  _hover={{ textDecoration: 'underline' }}
                  href={`/judge-profile/${result.judgeData.judge_id}?${new URLSearchParams(
                    {
                      ...(search.query_id && {
                        query_id: search.query_id,
                      }),
                      ...(search.dateFrom && { dateFrom: search.dateFrom }),
                      ...(search.dateTo && { dateTo: search.dateTo }),
                      ...(search.riskScore && { riskScore: search.riskScore }),
                    },
                  ).toString()}`}
                >
                  {result.judge}
                </Link>
              ) : (
                result.judge
              )}
            </Text>
          </Box>
          <Box>
            <Text fontSize="sm" color={COLORS.text.secondary}>
              <Text as="span" fontWeight="semibold" color={COLORS.neutral[700]}>
                {searchResults.locationLabel}
              </Text>{' '}
              {isEmptyValue(result.location) ? '-' : result.location}
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* Description */}
      {result.description && (
        <Text
          fontSize="sm"
          color={COLORS.text.secondary}
          lineHeight="relaxed"
          mb={4}
        >
          {result.description}
        </Text>
      )}

      {/* Action Links and Risk Score */}
      <Flex
        align="center"
        justify="space-between"
        pt={3}
        borderTop="1px"
        borderColor={COLORS.neutral[100]}
      >
        <HStack gap={4}>
          <Link
            color={COLORS.primary[600]}
            fontSize="sm"
            fontWeight="medium"
            _hover={{ textDecoration: 'underline' }}
            href={`/case-details/${result.case_id}?${new URLSearchParams({
              ...(search.query_id && {
                query_id: search.query_id,
              }),
              ...(search.dateFrom && { dateFrom: search.dateFrom }),
              ...(search.dateTo && { dateTo: search.dateTo }),
              ...(search.riskScore && { riskScore: search.riskScore }),
            }).toString()}`}
          >
            <HStack gap={1}>
              <Box as={FiEye} />
              <Text>View Details</Text>
            </HStack>
          </Link>
          <Link
            color={COLORS.neutral[400]}
            fontSize="sm"
            fontWeight="medium"
            opacity={0.5}
            cursor="not-allowed"
            pointerEvents="none"
            _hover={{ textDecoration: 'none' }}
          >
            <HStack gap={1}>
              <Box as={FiDownload} />
              <Text>Download Report</Text>
            </HStack>
          </Link>
        </HStack>

        <Text fontSize="sm" color={COLORS.text.secondary}>
          Risk Score:{' '}
          <Text
            as="span"
            color={getRiskScoreColor(result.risk)}
            fontWeight="bold"
          >
            {result.risk_score === 'N/A' || result.risk_score == null
              ? 'N/A'
              : `${result.risk_score}/10`}
          </Text>
        </Text>
      </Flex>
    </Card>
  )
}

export default SearchResultCard
