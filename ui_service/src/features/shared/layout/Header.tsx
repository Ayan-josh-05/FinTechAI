import { Box, Flex, HStack, Menu, Text } from '@chakra-ui/react'
import { FaSignOutAlt, FaUser } from 'react-icons/fa'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
  NAVIGATION_ITEMS,
  NAVIGATION_STYLES,
} from '../constants/StyleConstants'
import { ChevronDownIcon } from '../icons/ChevronDownIcon'
import { Avatar } from '../components/Avatar'
import { useAuthStore } from '@/features/Auth/store/authStore'
import { useLogout } from '@/features/Auth/hooks'

export default function Header() {
  const navigate = useNavigate()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const user = useAuthStore((state) => state.user)
  const logoutMutation = useLogout()

  // Check if we're on auth pages where user details should be hidden
  const isAuthPage =
    currentPath === '/signin' || currentPath === '/create-profile'

  const handleNavClick = (path: string, disabled?: boolean) => {
    if (disabled) return
    navigate({ to: path })
  }

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  return (
    <Box {...NAVIGATION_STYLES.header.container}>
      <Flex {...NAVIGATION_STYLES.header.layout} w="100%">
        {/* Logo */}
        <Flex {...NAVIGATION_STYLES.logo.container}>
          <Text {...NAVIGATION_STYLES.logo.text}>CubicTree</Text>
        </Flex>

        {/* Navigation Items - Center - Hidden on auth pages */}
        {!isAuthPage && (
          <Flex {...NAVIGATION_STYLES.nav.container}>
            <HStack {...NAVIGATION_STYLES.nav.itemsWrapper}>
              {NAVIGATION_ITEMS.map((item) => {
                const isActive = currentPath === item.path
                const isDisabled = item.disabled

                const navItemStyles = {
                  ...NAVIGATION_STYLES.nav.item.base,
                  ...(isActive
                    ? NAVIGATION_STYLES.nav.item.active
                    : isDisabled
                      ? NAVIGATION_STYLES.nav.item.disabled
                      : NAVIGATION_STYLES.nav.item.inactive),
                }

                return (
                  <Box
                    key={item.path}
                    {...navItemStyles}
                    onClick={() => handleNavClick(item.path, item.disabled)}
                  >
                    {item.label}
                  </Box>
                )
              })}
            </HStack>
          </Flex>
        )}

        {/* User Section - Hidden on auth pages */}
        {!isAuthPage && user && (
          <Flex {...NAVIGATION_STYLES.user.container}>
            <Menu.Root
              lazyMount={true}
              positioning={{ placement: 'bottom-end' }}
            >
              <Menu.Trigger asChild>
                <Flex {...NAVIGATION_STYLES.user.wrapper}>
                  <Avatar name={user.full_name} size={8} fontSize="sm" />
                  <Text {...NAVIGATION_STYLES.user.name}>{user.full_name}</Text>
                  <ChevronDownIcon />
                </Flex>
              </Menu.Trigger>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item
                    value="profile"
                    onClick={() => navigate({ to: '/profile' })}
                  >
                    <Flex alignItems="center" gap={2}>
                      <FaUser />
                      <Text>Profile</Text>
                    </Flex>
                  </Menu.Item>
                  <Menu.Item value="logout" onClick={handleLogout}>
                    <Flex alignItems="center" gap={2}>
                      <FaSignOutAlt />
                      <Text>Sign Out</Text>
                    </Flex>
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Menu.Root>
          </Flex>
        )}
      </Flex>
    </Box>
  )
}
