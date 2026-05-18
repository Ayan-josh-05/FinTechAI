import React from 'react'
import { Button, Spinner } from '@chakra-ui/react'
import { useLogout } from '../hooks'

interface LogoutButtonProps {
  children?: React.ReactNode
  variant?: 'solid' | 'outline' | 'ghost' | 'subtle' | 'surface' | 'plain'
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  colorScheme?: string
  onClick?: () => void
}

/**
 * LogoutButton component that handles user logout with API integration
 *
 * Usage:
 * ```tsx
 * <LogoutButton>Logout</LogoutButton>
 *
 * // Or with custom styling
 * <LogoutButton variant="outline" colorScheme="red" size="sm">
 *   Sign Out
 * </LogoutButton>
 * ```
 */
export const LogoutButton: React.FC<LogoutButtonProps> = ({
  children = 'Logout',
  variant = 'solid',
  size = 'md',
  colorScheme = 'blue',
  onClick,
  ...props
}) => {
  const logoutMutation = useLogout()

  const handleLogout = () => {
    if (onClick) {
      onClick()
    }
    logoutMutation.mutate()
  }

  return (
    <Button
      variant={variant}
      size={size}
      colorScheme={colorScheme}
      onClick={handleLogout}
      loading={logoutMutation.isPending}
      loadingText="Logging out..."
      spinner={<Spinner size="sm" />}
      disabled={logoutMutation.isPending}
      {...props}
    >
      {children}
    </Button>
  )
}

export default LogoutButton
