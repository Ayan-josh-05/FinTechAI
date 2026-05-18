import React, { useEffect } from 'react'
import { Box, Flex, Grid, Spinner, Text, VStack } from '@chakra-ui/react'
import { useNavigate } from '@tanstack/react-router'
import { FaSearch } from 'react-icons/fa'

import { ACTION_CARDS, GRID_CONFIG, METRICS_DATA } from '../constants'
import { MetricCard } from './MetricCard'
import { ActivityItem } from './ActivityItem'
import { ActionCard } from './ActionCard'

import type { Query } from '@/features/QueryManagement/types'
import { useQueries } from '@/features/QueryManagement/hooks'
import { useAuthStore } from '@/features/Auth/store/authStore'
import { Button } from '@/features/shared/components/Button'
import { Card } from '@/features/shared/components/Card'
import { PageLayout } from '@/features/shared/layout/PageLayout'
import { COLORS, STYLES } from '@/features/shared/constants/StyleConstants'
import { getCurrentUser } from '@/features/Auth/api'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const setUser = useAuthStore((state) => state.setUser)

  useEffect(() => {
    const checkOAuthRedirect = async () => {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.get('from') === 'OAuth') {
        try {
          window.history.replaceState({}, '', '/dashboard')
          const userData = await getCurrentUser()

          setUser({
            id: userData.id.toString(),
            email: userData.email,
            full_name: userData.full_name,
            profile_type: JSON.stringify(userData.profile),
          })
        } catch (error) {
          console.error('Error in OAuth flow:', error)
          // Clear user state and redirect - cookies are managed by backend
          navigate({ to: '/signin' })
        }
      }
    }

    checkOAuthRedirect()
  }, [setUser, navigate])

  // Fetch recent queries
  const { data: recentQueriesData, isLoading: isQueriesLoading } = useQueries(
    'recent',
    1,
    5,
  )

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Get user's display name - use full_name if available, otherwise use email
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User'

  // Handler function for action card clicks
  const handleActionCardClick = (title: string) => {
    switch (title) {
      case 'Legal Data Discovery':
        navigate({
          to: '/legal-data-discovery',
          search: { query_id: '' },
        })
        break
      case 'Advanced Search':
        navigate({ to: '/semantic-search' })
        break
      default:
      // Handle other action card clicks
    }
  }

  // Handler for "View all" button in Recent Activity
  const handleViewAllClick = () => {
    navigate({ to: '/query-management' })
  }

  // Format query title by splitting on underscore and capitalizing
  const formatQueryTitle = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Format query description based on search type and fields
  const formatQueryDescription = (query: Query) => {
    const { type, fields } = query.search_query

    switch (type) {
      case 'address_search':
        return `${fields.address || 'Address search'}, ${fields.district || ''}, ${fields.state || ''}`
      case 'pan_search':
        return `PAN: ${fields.pan_num || 'N/A'} (${fields.case_type || 'all'} cases)`
      default:
        return `Search query (${query.total_results || 0} results)`
    }
  }

  // Create action cards with dynamic handlers
  const actionCardsWithHandlers = ACTION_CARDS.map((card) => ({
    ...card,
    onClick: () => handleActionCardClick(card.title),
  }))

  return (
    <PageLayout>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Flex alignItems="center" justifyContent="space-between">
          <Box>
            <Text
              fontSize="4xl"
              {...STYLES.font.bold}
              color={COLORS.text.primary}
              mb={1}
            >
              {isLoading ? 'Loading...' : `Welcome back, ${displayName}`}
            </Text>
            <Text
              fontSize="xl"
              color={COLORS.text.secondary}
              {...STYLES.font.normal}
            >
              {currentDate}
            </Text>
          </Box>
        </Flex>

        {/* Action Cards */}
        <Grid templateColumns={GRID_CONFIG} gap={6}>
          {actionCardsWithHandlers.map((card, index) => (
            <ActionCard key={`${card.title}-${index}`} {...card} />
          ))}
        </Grid>

        {/* Metrics */}
        <Grid templateColumns={GRID_CONFIG} gap={6}>
          {METRICS_DATA.map((metric, index) => (
            <MetricCard key={`${metric.title}-${index}`} {...metric} />
          ))}
        </Grid>

        {/* Recent Activity */}
        <Card>
          <Box p={6}>
            <Flex alignItems="center" justifyContent="space-between" mb={6}>
              <Text
                fontSize="2xl"
                {...STYLES.font.semibold}
                color={COLORS.text.primary}
              >
                Recent Activity
              </Text>
              <Button variant="ghost" size="lg" onClick={handleViewAllClick}>
                View all
              </Button>
            </Flex>

            <VStack gap={2} align="stretch">
              {isQueriesLoading ? (
                <Flex justify="center" py={4}>
                  <Spinner size="md" color={COLORS.primary[500]} />
                </Flex>
              ) : recentQueriesData?.queries &&
                recentQueriesData.queries.length > 0 ? (
                recentQueriesData.queries.map((query, index) => (
                  <ActivityItem
                    key={`${query.query_id}-${index}`}
                    icon={FaSearch}
                    title={formatQueryTitle(query.search_query.type)}
                    description={formatQueryDescription(query)}
                    time={query.last_search}
                    iconColor="info"
                  />
                ))
              ) : (
                <Text color={COLORS.text.secondary} textAlign="center" py={4}>
                  No recent queries found
                </Text>
              )}
            </VStack>
          </Box>
        </Card>
      </VStack>
    </PageLayout>
  )
}

export default Dashboard
