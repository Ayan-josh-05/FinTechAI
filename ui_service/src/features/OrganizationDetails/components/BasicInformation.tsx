import React from 'react';
import {
  Box,
  Text,
  Stack,
  Link as ChakraLink,
  Grid,
  GridItem
} from '@chakra-ui/react';
import type { BasicInfo } from '../types';

interface BasicInformationProps {
  basicInfo: BasicInfo;
}

export const BasicInformation: React.FC<BasicInformationProps> = ({ basicInfo }) => {
  const isWebsiteAvailable = basicInfo.website && basicInfo.website !== 'Not Available';

  return (
    <Box p={6} bg="white" borderRadius="lg" shadow="sm">
      <Text fontSize="lg" fontWeight="semibold" mb={4}>
        Basic Information
      </Text>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <GridItem>
          <Stack direction="column" align="stretch" gap={4}>
            <Box>
              <Text color="gray.600" fontSize="sm">
                Organization Name
              </Text>
              <Text>{basicInfo.name}</Text>
            </Box>
            <Box>
              <Text color="gray.600" fontSize="sm">
                Organization Type
              </Text>
              <Text>{basicInfo.organizationType}</Text>
            </Box>
            <Box>
              <Text color="gray.600" fontSize="sm">
                Website
              </Text>
              {isWebsiteAvailable ? (
                <ChakraLink href={`https://${basicInfo.website}`} color="blue.500" target="_blank" rel="noopener noreferrer">
                  {basicInfo.website}
                </ChakraLink>
              ) : (
                <Text>{basicInfo.website}</Text>
              )}
            </Box>
            <Box>
              <Text color="gray.600" fontSize="sm">
                Registered At
              </Text>
              <Text>{basicInfo.registeredAt}</Text>
            </Box>
          </Stack>
        </GridItem>
        <GridItem>
          <Stack direction="column" align="stretch" gap={4}>
            <Box>
              <Text color="gray.600" fontSize="sm">
                Contact Information
              </Text>
              <Text>{basicInfo.contactInfo}</Text>
            </Box>
            <Box>
              <Text color="gray.600" fontSize="sm">
                Address
              </Text>
              <Text>{basicInfo.address}</Text>
            </Box>
          </Stack>
        </GridItem>
      </Grid>
    </Box>
  );
};
