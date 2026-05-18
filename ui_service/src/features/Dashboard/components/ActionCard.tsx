import { Box, Flex, Text } from '@chakra-ui/react'
import type { IconType } from 'react-icons/lib'
import { Card } from '@/features/shared/components/Card'

import { COLORS } from '@/features/shared/constants/StyleConstants'
interface ActionCardProps {
  icon: IconType
  title: string
  description: string
  buttonText: string
  onClick?: () => void
  iconBackground?: string
  iconBorderColor?: string
  iconColor?: string
  buttonColor?: string
  buttonHoverColor?: string
}

export const ActionCard = ({
  icon: Icon,
  title,
  description,
  buttonText,
  onClick,
  iconBackground = 'blue.50',
  iconBorderColor = 'blue.200',
  iconColor = '#3B82F6',
  buttonColor = 'blue.500',
  buttonHoverColor = 'blue.700',
}: ActionCardProps) => {
  return (
    <Card>
      <Box p={6}>
        <Flex alignItems="flex-start" gap={4}>
          {/* Icon with dynamic styling */}
          <Box
            bg={iconBackground}
            p={3}
            borderRadius="lg"
            borderColor={iconBorderColor}
            display="flex"
            alignItems="center"
            justifyContent="center"
            w={12}
            h={12}
            flexShrink={0}
            position="relative"
          >
            <Icon size={20} color={iconColor} />
          </Box>

          <Box flex={1}>
            <Box mb={4}>
              <Text fontSize="2xl" fontWeight="medium" color={COLORS.neutral[800]} mb={2}>
                {title}
              </Text>
              <Text fontSize="lg" color={COLORS.text.secondary} fontWeight={'normal'}>
                {description}
              </Text>
            </Box>

            {/* Text link with dynamic hover color */}
            <Text
              as="button"
              onClick={onClick}
              color={buttonColor}
              _hover={{ color: buttonHoverColor }}
              cursor="pointer"
              fontSize="md"
              fontWeight="semibold"
              transition="color 0.2s"
            >
              {buttonText} →
            </Text>
          </Box>
        </Flex>
      </Box>
    </Card>
  )
}

export default ActionCard
