import { memo, useCallback, useEffect, useState } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { useSearch } from '@tanstack/react-router'
import { TEXT_CONTENT } from '../constants'
import type { FilterState } from '../types'
import {
  Button,
  Card,
  DatePicker,
  RadioGroup,
  RadioGroupItem,
} from '@/features/shared/components'

import { COLORS } from '@/features/shared/constants/StyleConstants'
import { parseAPIDateString } from '@/utils/dateUtils'

interface FilterSidebarProps {
  onFiltersChange?: (filters: FilterState) => void
  onClearFilters?: () => void
  onApplyFilters?: (filters: FilterState) => void
  reset?: boolean
  hasSearchId?: boolean
}

const FilterSidebar = memo(
  ({
    onFiltersChange,
    onClearFilters,
    onApplyFilters,
    reset,
    hasSearchId,
  }: FilterSidebarProps) => {
    const search = useSearch({ from: '/legal-data-discovery' })

    const [filters, setFilters] = useState<FilterState>(() => {
      // Initialize filters from URL parameters
      const urlFilters: FilterState = {
        dateFrom: parseAPIDateString(search.dateFrom),
        dateTo: parseAPIDateString(search.dateTo),
        riskScore: search.riskScore || undefined,
        dateRange: {
          from: parseAPIDateString(search.dateFrom),
          to: parseAPIDateString(search.dateTo),
        },
        riskScoreFilter: search.riskScore || undefined,
      }
      return urlFilters
    })

    // Sync filters with URL parameters when they change
    useEffect(() => {
      const urlFilters: FilterState = {
        dateFrom: parseAPIDateString(search.dateFrom),
        dateTo: parseAPIDateString(search.dateTo),
        riskScore: search.riskScore || undefined,
        dateRange: {
          from: parseAPIDateString(search.dateFrom),
          to: parseAPIDateString(search.dateTo),
        },
        riskScoreFilter: search.riskScore || undefined,
      }
      setFilters(urlFilters)
    }, [search.dateFrom, search.dateTo, search.riskScore])

    // Reset filters when reset prop changes
    useEffect(() => {
      if (reset) {
        const defaultFilters: FilterState = {
          dateFrom: null,
          dateTo: null,
          riskScore: undefined,
          dateRange: {
            from: null,
            to: null,
          },
          riskScoreFilter: undefined,
        }
        setFilters(defaultFilters)
        onFiltersChange?.(defaultFilters)
      }
    }, [reset, onFiltersChange])

    const handleFilterChange = useCallback(
      (field: keyof FilterState, value: any) => {
        const newFilters = { ...filters, [field]: value }
        setFilters(newFilters)
        // Don't call onFiltersChange for date changes - only update local state
        // onFiltersChange will be called when Apply button is clicked
      },
      [filters],
    )

    const handleClearAll = useCallback(() => {
      const clearedFilters: FilterState = {
        dateFrom: null,
        dateTo: null,
        riskScore: undefined,
        dateRange: {
          from: null,
          to: null,
        },
        riskScoreFilter: undefined,
      }
      setFilters(clearedFilters)
      onClearFilters?.()
    }, [onClearFilters])

    const { filters: filterText } = TEXT_CONTENT

    return (
      <Card
        w="64"
        borderColor={COLORS.neutral[200]}
        bg="white"
        shadow="sm"
        overflow="hidden"
      >
        {/* Header */}
        <Box
          p={4}
          borderBottom="1px"
          borderColor={COLORS.neutral[100]}
          bg={COLORS.neutral[50]}
        >
          <Flex align="center" justify="space-between">
            <Text
              fontSize="base"
              fontWeight="semibold"
              color={COLORS.neutral[800]}
            >
              {filterText.title}
            </Text>
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              {filterText.clearAll}
            </Button>
          </Flex>
        </Box>

        {/* Content */}
        <Box p={4}>
          <Stack direction="column">
            {/* Date Range */}
            <Box mb={6}>
              <Text
                fontSize="sm"
                fontWeight="medium"
                color={COLORS.neutral[700]}
                mb={4}
              >
                {filterText.dateRange}
              </Text>
              <Stack direction="column" gap={4}>
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="medium"
                    color={COLORS.neutral[600]}
                    mb={2}
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    {filterText.from}
                  </Text>
                  <DatePicker
                    value={filters.dateFrom}
                    onChange={(date) => handleFilterChange('dateFrom', date)}
                    placeholder="Select start date"
                    maxDate={filters.dateTo || undefined}
                  />
                </Box>
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="medium"
                    color={COLORS.neutral[600]}
                    mb={2}
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    {filterText.to}
                  </Text>
                  <DatePicker
                    value={filters.dateTo}
                    onChange={(date) => handleFilterChange('dateTo', date)}
                    placeholder="Select end date"
                    minDate={filters.dateFrom || undefined}
                  />
                </Box>
              </Stack>
            </Box>

            {/* Risk Score */}
            <Box mb={6}>
              <Text
                fontSize="sm"
                fontWeight="medium"
                color={COLORS.neutral[700]}
                mb={3}
              >
                {filterText.riskScore}
              </Text>
              <RadioGroup
                value={filters.riskScore || ''}
                onChange={(value) => handleFilterChange('riskScore', value)}
              >
                <RadioGroupItem value="low">Low (1-3)</RadioGroupItem>
                <RadioGroupItem value="medium">Medium (4-6)</RadioGroupItem>
                <RadioGroupItem value="high">High (7-10)</RadioGroupItem>
              </RadioGroup>
            </Box>

            {/* Apply Filters Button */}
            <Button
              size="md"
              onClick={() => onApplyFilters?.(filters)}
              disabled={!hasSearchId}
            >
              {filterText.applyFilters}
            </Button>
          </Stack>
        </Box>
      </Card>
    )
  },
)

FilterSidebar.displayName = 'FilterSidebar'

export default FilterSidebar
