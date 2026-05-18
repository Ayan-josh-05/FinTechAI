import React from 'react'
import { Box, Flex, Grid, HStack, Image, VStack } from '@chakra-ui/react'
import { Card } from './Card'
import { Badge } from './Badge'
import { Button } from './Button'
import { BodySmall, H3 } from './Typography'
import { getAvatarColor, getInitials } from '@/utils/avatarUtils'

import { COLORS } from '@/features/shared/constants/StyleConstants'

export interface EntityAction {
  label: string
  icon?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  onClick: () => void
  isDisabled?: boolean
}

export interface EntityInfoItem {
  label: string
  value: string
  textColor?: string
}

export interface EntityHeaderProps {
  title: string
  image?: string
  imageAlt?: string
  imageSize?: string | number
  statusBadges?: Array<{ text: string; type: string }> | Array<string>
  actions?: Array<EntityAction>
  infoItems?: Array<EntityInfoItem>
  variant?: 'elevated' | 'outline' | 'filled'
  customContent?: React.ReactNode
  useInitials?: boolean // New prop to control initials vs image
}

export const EntityHeader: React.FC<EntityHeaderProps> = ({
  title,
  image,
  imageAlt,
  imageSize = '80px',
  statusBadges = [],
  actions = [],
  infoItems = [],
  variant = 'elevated',
  customContent,
  useInitials = false,
}) => {
  return (
    <Card p={6} variant={variant} bg="white" borderRadius="lg" boxShadow="sm">
      <VStack gap={2} align="stretch">
        {/* Main Header Row */}
        <Flex justify="space-between" align="center" w="100%">
          <Flex align="center" gap={2}>
            {/* Optional Image/Avatar or Initials */}
            {(image || useInitials) && (
              <Box flexShrink={0}>
                {useInitials ? (
                  <Flex
                    boxSize={imageSize}
                    bg={getAvatarColor(title)}
                    color="white"
                    borderRadius="lg"
                    align="center"
                    justify="center"
                    fontSize="2xl"
                    fontWeight="bold"
                    border="2px solid"
                    borderColor={COLORS.neutral[200]}
                  >
                    {getInitials(title)}
                  </Flex>
                ) : (
                  <Image
                    src={image}
                    alt={imageAlt || title}
                    boxSize={imageSize}
                    objectFit="contain"
                    borderRadius="lg"
                    border="2px solid"
                    borderColor={COLORS.neutral[200]}
                  />
                )}
              </Box>
            )}

            {/* Title and Status Badges */}
            <Flex align="center" gap={2} flexWrap="wrap">
              <H3>{title}</H3>

              {/* Status Badges */}
              <Badge
                items={
                  statusBadges.length > 0 && typeof statusBadges[0] === 'string'
                    ? (statusBadges as Array<string>).map((text) => ({
                        text,
                        type: text.toLowerCase(),
                      }))
                    : (statusBadges as Array<{ text: string; type: string }>)
                }
              />
            </Flex>
          </Flex>

          {/* Action Buttons */}
          {actions.length > 0 && (
            <HStack gap={3} flexWrap="wrap">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  // leftIcon={action.icon}
                  variant={action.variant || 'primary'}
                  onClick={action.onClick}
                  size="sm"
                  disabled={action.isDisabled}
                >
                  <Flex gap={2}>
                    <span>{action.icon}</span>
                    {action.label}
                  </Flex>
                </Button>
              ))}
            </HStack>
          )}
        </Flex>

        {/* Additional Information Grid */}
        {infoItems.length > 0 && (
          <Grid
            templateColumns={{
              base: '1fr',
              sm: 'repeat(2, 1fr)',
              md: `repeat(${Math.min(infoItems.length, 4)}, 1fr)`,
            }}
            gap={6}
            pt={1}
          >
            {infoItems.map((item, index) => (
              <Flex gap={2} key={index} alignItems={'center'}>
                <BodySmall>{item.label}</BodySmall>
                <BodySmall fontWeight="bold" color={item.textColor}>
                  {item.value}
                </BodySmall>
              </Flex>
            ))}
          </Grid>
        )}

        {/* Custom Content Slot */}
        {customContent && <Box pt={2}>{customContent}</Box>}
      </VStack>
    </Card>
  )
}

export default EntityHeader
