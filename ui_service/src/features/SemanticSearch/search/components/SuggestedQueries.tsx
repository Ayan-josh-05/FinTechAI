import { Box, Grid, HStack, Text, VStack } from '@chakra-ui/react'
import { FaBuilding, FaGavel, FaShieldAlt, FaUsers } from 'react-icons/fa'

interface SuggestedQuery {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  color: string
}

interface SuggestedQueriesProps {
  onSuggestionClick?: (suggestionText: string) => void
}

const SuggestedQueries = ({ onSuggestionClick }: SuggestedQueriesProps) => {
  const suggestedQueries: Array<SuggestedQuery> = [
    {
      id: '1',
      title: 'Contract Law Analysis',
      description: '"What makes a contract legally binding in India?"',
      icon: FaGavel,
      color: 'blue.500',
    },
    {
      id: '2',
      title: 'Privacy & Data Protection',
      description: '"GDPR compliance requirements for businesses"',
      icon: FaShieldAlt,
      color: 'blue.500',
    },
    {
      id: '3',
      title: 'Corporate Governance',
      description: '"Director\'s duties and liabilities in company law"',
      icon: FaBuilding,
      color: 'blue.500',
    },
    {
      id: '4',
      title: 'Employment Law',
      description: '"Employee rights during termination procedures"',
      icon: FaUsers,
      color: 'blue.500',
    },
  ]

  return (
    <Box>
      <Text fontSize="xl" fontWeight="bold" color="gray.800" mb={4}>
        Suggested Queries
      </Text>

      <Grid templateColumns="repeat(2, 1fr)" gap={4}>
        {suggestedQueries.map((query) => (
          <Box
            key={query.id}
            p={5}
            bg="white"
            border="1px"
            borderColor="gray.200"
            borderRadius="lg"
            cursor="pointer"
            boxShadow="sm"
            _hover={{
              shadow: 'lg',
              borderColor: 'blue.400',
              transform: 'translateY(-4px)',
              bg: 'blue.50',
            }}
            transition="all 0.3s"
            onClick={() => {
              // Remove surrounding double quotes from the description
              const cleanDescription = query.description.replace(/^"|"$/g, '')
              onSuggestionClick?.(cleanDescription)
            }}
          >
            <VStack align="start" gap={3}>
              <HStack gap={3}>
                <Box
                  p={2}
                  bg="blue.50"
                  borderRadius="md"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <query.icon style={{ fontSize: '24px', color: '#3182ce' }} />
                </Box>
                <Text fontSize="md" fontWeight="bold" color="gray.800">
                  {query.title}
                </Text>
              </HStack>

              <Text fontSize="sm" color="gray.600" fontStyle="italic" lineHeight="1.6">
                {query.description}
              </Text>
            </VStack>
          </Box>
        ))}
      </Grid>
    </Box>
  )
}

export default SuggestedQueries
