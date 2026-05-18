import { Box, Flex, Heading, Link, Text, VStack } from '@chakra-ui/react'
import { useNavigate } from '@tanstack/react-router'
import type { CourtDetails } from '../types'

import { COLORS } from '@/features/shared/constants/StyleConstants'
import { useNavigationContext } from '@/utils/navigationContext'

interface CourtInformationProps {
  courtInfo: CourtDetails | null | undefined
  caseNumber?: string
}

const CourtInformation = ({ courtInfo, caseNumber }: CourtInformationProps) => {
  const navigate = useNavigate()
  const { createNavigationWithContext } = useNavigationContext()

  // Add safety check for courtInfo
  if (!courtInfo) {
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
          Court Information
        </Heading>
        <Text color={COLORS.text.tertiary}>No court information available</Text>
      </Box>
    )
  }

  const { name, judge, location, room } = courtInfo

  const handleCourtClick = () => {
    if (courtInfo.court_id && courtInfo.court_id !== 'N/A') {
      const navigation = createNavigationWithContext(
        '/court-details/$courtId',
        { courtId: courtInfo.court_id },
        {
          courtId: courtInfo.court_id,
          courtName: courtInfo.name || courtInfo.court_id,
          ...(caseNumber && { caseNumber }), // Include the actual case number if available
        },
      )
      navigate(navigation)
    }
  }

  const handleJudgeClick = (judgeName: string) => {
    // Don't navigate if judge name is null, undefined, or 'N/A'
    if (!judgeName || judgeName === 'N/A') {
      return
    }

    // Don't navigate if judge is null
    if (!judge) {
      return
    }

    // Find the judge ID from the judge array
    const judgeData = Array.isArray(judge)
      ? judge.find((j) => j.name === judgeName)
      : judge
    if (
      judgeData?.judge_id &&
      judgeData.judge_id !== '' &&
      judgeData.judge_id !== 'N/A'
    ) {
      const navigation = createNavigationWithContext(
        '/judge-profile/$judgeId',
        { judgeId: judgeData.judge_id },
        {
          judgeId: judgeData.judge_id,
          judgeName: judgeName,
          ...(caseNumber && { caseNumber }), // Include the actual case number if available
        },
      )
      navigate(navigation)
    }
  }

  const courtInformation = [
    {
      label: 'Court',
      value: name || 'N/A',
      isClickable: courtInfo.court_id && courtInfo.court_id !== 'N/A',
      onClick: () => handleCourtClick(),
    },
    {
      label: 'Presiding Judge(s)',
      value: !judge
        ? 'N/A'
        : Array.isArray(judge)
          ? judge.length > 0
            ? judge.map((j) => j.name || 'N/A').join(', ')
            : 'N/A'
          : judge.name || 'N/A',
      isClickable: true,
      onClick: handleJudgeClick,
      judgeNames: !judge
        ? []
        : Array.isArray(judge)
          ? judge.length > 0
            ? judge
                .map((j) => j.name)
                .filter((judgeName) => judgeName && judgeName !== 'N/A')
            : []
          : judge.name && judge.name !== 'N/A'
            ? [judge.name]
            : [],
    },
    {
      label: 'Location',
      value: location || 'N/A',
      isClickable: false,
    },
    ...(room && room !== 'N/A'
      ? [
          {
            label: 'Room',
            value: room,
            isClickable: false,
          },
        ]
      : []),
  ]

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
        Court Information
      </Heading>
      <VStack gap={3} align="stretch" fontSize="sm">
        {courtInformation.map(
          ({ label, value, isClickable, onClick, judgeNames }, key) => (
            <Flex key={`courtInfo-${key}`} gap={1} direction="column">
              <Text color={COLORS.text.secondary}>{label}:</Text>
              {label === 'Presiding Judge(s)' && value === 'N/A' ? (
                <Text fontWeight="normal">{value}</Text>
              ) : label === 'Presiding Judge(s)' &&
                judgeNames &&
                judgeNames.length > 0 ? (
                <Box as="ul" ml={4} css={{ listStyleType: 'disc' }} pl={2}>
                  {judgeNames.map((judgeName, idx) => (
                    <Box as="li" key={`judge-${idx}`}>
                      <Link
                        color={COLORS.primary[600]}
                        textDecoration="underline"
                        cursor="pointer"
                        onClick={() => judgeName && onClick(judgeName)}
                        _hover={{ color: COLORS.primary[700] }}
                      >
                        {judgeName}
                      </Link>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Text fontWeight="normal">
                  {isClickable && onClick ? (
                    <Link
                      color={COLORS.primary[600]}
                      textDecoration="underline"
                      cursor="pointer"
                      onClick={() => onClick(value)}
                      _hover={{ color: COLORS.primary[700] }}
                    >
                      {value}
                    </Link>
                  ) : (
                    value
                  )}
                </Text>
              )}
            </Flex>
          ),
        )}
      </VStack>
    </Box>
  )
}

export default CourtInformation
