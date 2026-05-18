import React from 'react'
import { Box, Flex, Link, Text } from '@chakra-ui/react'
import { FiChevronRight } from 'react-icons/fi'
import { useNavigate } from '@tanstack/react-router'
import { STYLES } from '../constants/StyleConstants'

import { COLORS } from '@/features/shared/constants/StyleConstants'
export interface BreadcrumbItem {
  label: string
  href?: string
  isCurrentPage?: boolean
}

export interface BreadcrumbProps {
  items: Array<BreadcrumbItem>
  separator?: React.ReactNode
  fontSize?: string
  color?: string
  spacing?: number
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = <FiChevronRight size={12} color={COLORS.text.disabled} />,
  fontSize = 'sm',
  color = 'gray.600',
  spacing = 2,
}) => {
  const navigate = useNavigate()

  const handleClick = (href: string, e: React.MouseEvent) => {
    e.preventDefault()

    // Check if the href contains query parameters
    if (href.includes('?')) {
      const [path, queryString] = href.split('?')
      const searchParams = new URLSearchParams(queryString)
      const searchObject: Record<string, string> = {}

      // Convert URLSearchParams to object
      searchParams.forEach((value, key) => {
        searchObject[key] = value
      })

      navigate({ to: path as any, search: searchObject as any })
    } else {
      navigate({ to: href as any })
    }
  }

  return (
    <Flex align="center" wrap="wrap" fontSize={fontSize} color={color} m={0}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        const isCurrentPage = item.isCurrentPage || isLast

        return (
          <React.Fragment key={index}>
            <Box>
              {item.href && !isCurrentPage ? (
                <Link
                  href={item.href}
                  color={COLORS.primary[600]}
                  _hover={{ color: 'blue.800', textDecoration: 'underline' }}
                  cursor="pointer"
                  onClick={(e) => handleClick(item.href!, e)}
                  {...STYLES.transition.colors}
                >
                  {item.label}
                </Link>
              ) : (
                <Text
                  color={isCurrentPage ? 'gray.900' : color}
                  fontWeight={isCurrentPage ? 'medium' : 'normal'}
                >
                  {item.label}
                </Text>
              )}
            </Box>
            {!isLast && (
              <Box mx={spacing} display="flex" alignItems="center">
                {separator}
              </Box>
            )}
          </React.Fragment>
        )
      })}
    </Flex>
  )
}

// Individual components for more flexible usage
export const BreadcrumbList: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Flex align="center" wrap="wrap" fontSize="sm">
    {children}
  </Flex>
)

export const BreadcrumbItem: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <Box>{children}</Box>

export const BreadcrumbLink: React.FC<{
  href: string
  children: React.ReactNode
  className?: string
}> = ({ href, children, className }) => (
  <Link
    href={href}
    color={COLORS.primary[600]}
    _hover={{ color: 'blue.800', textDecoration: 'underline' }}
    className={className}
    {...STYLES.transition.colors}
  >
    {children}
  </Link>
)

export const BreadcrumbPage: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Text color={COLORS.text.primary} fontWeight="medium">
    {children}
  </Text>
)

export const BreadcrumbSeparator: React.FC<{ children?: React.ReactNode }> = ({
  children = <FiChevronRight size={12} color={COLORS.text.disabled} />,
}) => (
  <Box mx={2} display="flex" alignItems="center">
    {children}
  </Box>
)

export default Breadcrumb
