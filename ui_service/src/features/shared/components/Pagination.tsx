'use client'

import {
  ButtonGroup,
  Pagination as ChakraPagination,
  Flex,
  IconButton,
  Text,
} from '@chakra-ui/react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

import { COLORS, PER_PAGE } from '@/features/shared/constants'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  size?: 'sm' | 'md' | 'lg'
  totalCount?: number
  pageSize?: number
}

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  size = 'md',
  totalCount,
  pageSize = PER_PAGE,
}: PaginationProps) => {
  if (totalPages <= 1) return null

  // Calculate count if not provided
  const count = totalCount || totalPages * pageSize

  return (
    <ChakraPagination.Root
      count={count}
      pageSize={pageSize}
      page={currentPage}
      onPageChange={(details) => onPageChange(details.page)}
      siblingCount={2}
    >
      <Flex align="center" justify="center" gap={2}>
        {/* Previous Button */}
        <ChakraPagination.PrevTrigger asChild>
          <IconButton size={size} variant="outline">
            <FiChevronLeft />
          </IconButton>
        </ChakraPagination.PrevTrigger>

        {/* Page Numbers */}
        <ButtonGroup variant="outline" size={size}>
          <ChakraPagination.Items
            render={(page) => (
              <IconButton
                variant={page.value === currentPage ? 'solid' : 'outline'}
                colorScheme={page.value === currentPage ? 'blue' : 'gray'}
              >
                {page.value}
              </IconButton>
            )}
          />
        </ButtonGroup>

        {/* Next Button */}
        <ChakraPagination.NextTrigger asChild>
          <IconButton size={size} variant="outline">
            <FiChevronRight />
          </IconButton>
        </ChakraPagination.NextTrigger>

        {/* Page Info */}
        <Text fontSize="sm" color={COLORS.text.secondary} ml={4}>
          Page {currentPage} of {totalPages}
        </Text>
      </Flex>
    </ChakraPagination.Root>
  )
}

export default Pagination
