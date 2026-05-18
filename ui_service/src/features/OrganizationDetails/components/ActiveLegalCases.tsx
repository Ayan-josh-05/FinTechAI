import React from 'react';
import {
  Box,
  Text,
  Button,
  Flex,
  Stack
} from '@chakra-ui/react';
import { Badge } from '@/features/shared/components';
import type { ActiveLegalCase } from '../types';

interface ActiveLegalCasesProps {
  cases: ActiveLegalCase[];
}

const colorToBadgeType = (color: string): string => {
  const mapping: Record<string, string> = {
    red: 'critical',
    yellow: 'warning',
    green: 'success',
    purple: 'info',
    gray: 'medium',
    success: 'success'
  };
  return mapping[color] || 'medium';
};

export const ActiveLegalCases: React.FC<ActiveLegalCasesProps> = ({ cases }) => {
  if (!cases || cases.length === 0) {
    return (
      <Box p={6} bg="white" borderRadius="lg" shadow="sm">
        <Text fontSize="lg" fontWeight="semibold" mb={4}>
          Active Legal Cases
        </Text>
        <Text color="gray.500">No active legal cases</Text>
      </Box>
    );
  }

  return (
    <Box p={6} bg="white" borderRadius="lg" shadow="sm">
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="semibold">
          Active Legal Cases
        </Text>
      </Flex>
      <Stack direction="column" gap="3">
        {cases.map((legalCase, _) => (
          <Box
            key={legalCase.caseNo}
            p={4}
            borderWidth="1px"
            borderRadius="md"
          >
            <Flex justify="space-between" align="flex-start" mb={2}>
              <Stack direction="column" gap="1">
                <Text fontWeight="medium">{legalCase.title}</Text>
                <Text color="gray.600" fontSize="sm">
                  {legalCase.summary}
                </Text>
              </Stack>
              <Text fontSize="sm" color="gray.500">
                Case No: {legalCase.caseNo}
              </Text>
            </Flex>
            <Flex justify="space-between" align="flex-start" mb={2}>
              <Text fontSize="sm" color="gray.500">
                Filed: {new Date(legalCase.filed).toLocaleDateString()}
              </Text>
              {legalCase.nextHearing && (
                <Text fontSize="sm" color="gray.500">
                  Next Hearing: {new Date(legalCase.nextHearing).toLocaleDateString()}
                </Text>
              )}
            </Flex>
            <Flex justify="space-between" align="center" mt={2}>
              <Badge items={legalCase.statusBadges.map(badge => ({
                text: badge.text,
                type: colorToBadgeType(badge.color)
              }))} />
              {legalCase.linkLabel && (
                <Button size="sm" variant="ghost" color="blue">
                  {legalCase.linkLabel}
                </Button>
              )}
            </Flex>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};
