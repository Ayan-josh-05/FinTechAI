import React from 'react';
import {
  Box,
  Text,
  Grid,
  GridItem,
  Stack
} from '@chakra-ui/react';
import type { LegalIdentifier } from '../types';

interface LegalIdentifiersProps {
  legalIdentifiers: Array<LegalIdentifier>;
}

export const LegalIdentifiers: React.FC<LegalIdentifiersProps> = ({ legalIdentifiers }) => {
  if (!legalIdentifiers || legalIdentifiers.length === 0) {
    return (
      <Box p={6} bg="white" borderRadius="lg" shadow="sm">
        <Text fontSize="lg" fontWeight="semibold" mb={4}>
          Legal Identifiers
        </Text>
        <Text color="gray.500">No legal identifiers available</Text>
      </Box>
    );
  }

  return (
    <Box p={6} bg="white" borderRadius="lg" shadow="sm">
      <Text fontSize="lg" fontWeight="semibold" mb={4}>
        Legal Identifiers
      </Text>
      <Grid templateColumns="repeat(3, 1fr)" gap={6}>
        {legalIdentifiers.map((identifier, _) => (
          <GridItem key={`${identifier.type}-${identifier.value}`}>
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Stack direction="column" align="flex-start" gap="2">
                <Text color="gray.600" fontSize="sm">
                  {identifier.type}
                </Text>
                <Text fontWeight="medium" fontSize="sm">
                  {identifier.value}
                </Text>
                {identifier.verified && (
                  <Text fontSize="xs" color="green.500">
                    Verified
                  </Text>
                )}
              </Stack>
            </Box>
          </GridItem>
        ))}
      </Grid>
    </Box>
  );
};
