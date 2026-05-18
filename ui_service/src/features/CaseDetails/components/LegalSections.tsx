import { Box, Grid, Heading, Text, VStack } from '@chakra-ui/react'
import type { LegalSectionsMap } from '../types'

import { COLORS } from '@/features/shared/constants/StyleConstants'

interface LegalSectionsProps {
  legalSections: LegalSectionsMap
}

const LegalSections = ({ legalSections }: LegalSectionsProps) => {
  // If no data available, show placeholder
  if (Object.keys(legalSections).length === 0) {
    return (
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        shadow="sm"
        border="1px"
        borderColor={COLORS.neutral[200]}
      >
        <Heading size="sm" mb={4} color={COLORS.neutral[800]}>
          Legal Sections Involved
        </Heading>
        <Text color={COLORS.text.tertiary} textAlign="center">
          No data available
        </Text>
      </Box>
    )
  }

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      shadow="sm"
      border="1px"
      borderColor={COLORS.neutral[200]}
    >
      <Heading size="sm" mb={4} color={COLORS.neutral[800]}>
        Legal Sections Involved
      </Heading>
      <Grid templateColumns="1fr" gap={6}>
        {Object.entries(legalSections).map(([act, sections], index) => (
          <Box
            key={index}
            p={4}
            borderRadius="lg"
            shadow="sm"
            border="1px"
            borderColor={COLORS.neutral[200]}
          >
            <Text fontWeight="semibold" mb={3} color={COLORS.neutral[800]}>
              {act}
            </Text>
            <VStack gap={2} align="stretch">
              {sections.map((section, sIndex) => (
                <Text key={sIndex} fontSize="sm" color={COLORS.text.secondary}>
                  • {section}
                </Text>
              ))}
            </VStack>
          </Box>
        ))}
      </Grid>
    </Box>
  )
}

export default LegalSections
