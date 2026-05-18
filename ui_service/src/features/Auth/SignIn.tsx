import { useState } from 'react'
import { Box, Text } from '@chakra-ui/react'
import { useNavigate } from '@tanstack/react-router'
import { useGoogleOAuth, useSignInUser } from './hooks'
import { showValidationErrors, validateSignInForm } from './utils/validation'
import { getCurrentUser } from './api'
import { useAuthStore } from './store/authStore'
import { Input } from '@/features/shared/components/Input'
import { Button } from '@/features/shared/components/Button'
import { ArrowRightIcon } from '@/features/shared/icons/ArrowRightIcon'
import { ToastNotifications } from '@/features/shared/components/ToastNotifications'

import { COLORS } from '@/features/shared/constants/StyleConstants'

function SigninForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const [touched, setTouched] = useState<{
    email?: boolean
    password?: boolean
  }>({})
  // TanStack Query mutations
  const signInMutation = useSignInUser()
  const googleOAuthMutation = useGoogleOAuth()
  
  // Auth store
  const { setUser } = useAuthStore()

  function handleChange(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setTouched((t) => ({ ...t, [field]: true }))

    // Clear errors when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((e) => ({ ...e, [field]: '' }))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate form data
    const validation = validateSignInForm(form)
    if (!validation.isValid) {
      showValidationErrors(validation.errors)
      return
    }

    setErrors({})

    // Call the sign in mutation
    signInMutation.mutate(
      { credentials: form, showErrorNotification: false }, // Disable automatic error notifications
      {
        onSuccess: async () => {
          try {
            // Fetch user data immediately after successful login
            console.log('Login successful - fetching user data...')
            const userData = await getCurrentUser(false) // Don't show error notifications
            
            // Transform response to User format for auth store
            const transformedUser = {
              id: userData.id.toString(),
              email: userData.email,
              full_name: userData.full_name,
              profile_type: JSON.stringify(userData.profile),
            }
            
            // Store user data in auth store
            setUser(transformedUser)
            console.log('User data stored successfully:', transformedUser.email)
            
            ToastNotifications.signInSuccess()
            // Navigate to dashboard with user data available
            navigate({ to: '/dashboard' })
          } catch (error) {
            // If /me call fails, still navigate but log the error
            console.error('Failed to fetch user data after login:', error)
            ToastNotifications.signInSuccess()
            // Navigate anyway - useAuthInitialization will handle user data fetching
            navigate({ to: '/dashboard' })
          }
        },
        onError: (error: any) => {
          // Handle authentication errors locally
          console.error('Sign in error:', error)

          // Check if it's a 401 error (incorrect credentials)
          if (error?.response?.status === 401) {
            const errorMessage =
              error?.response?.data?.message ||
              error?.response?.data?.detail ||
              'Incorrect email or password'

            setErrors({
              email: '',
              password: errorMessage,
            })
          } else {
            // For other errors, show a generic message
            const errorMessage =
              error?.response?.data?.message ||
              error?.response?.data?.detail ||
              'An error occurred. Please try again.'

            setErrors({
              email: '',
              password: errorMessage,
            })
          }
        },
      },
    )
  }

  function handleGoogleSignIn() {
    googleOAuthMutation.mutate(undefined, {
      onSuccess: () => {
        // The redirect will happen automatically in the API function
        // No need to handle success here as the user will be redirected
      },
      onError: (error: Error) => {
        console.error('Google OAuth error:', error.message)
        // The axios interceptor will handle error notifications
      },
    })
  }

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="100vh"
      bg={COLORS.neutral[50]}
      p={8}
    >
      <Box maxW="md" w="full" bg="white" borderRadius="xl" boxShadow="lg" p={8}>
        {/* Header */}
        <Box textAlign="left" mb={8}>
          <Text
            fontSize="2xl"
            fontWeight="bold"
            color={COLORS.neutral[800]}
            mb={2}
          >
            Sign In
          </Text>
          <Text fontSize="sm" color={COLORS.text.secondary} fontWeight="normal">
            Welcome back! Please sign in to your account
          </Text>
        </Box>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <Box display="flex" flexDirection="column" gap={6}>
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) => handleChange('email', value)}
              placeholder="Enter your email address"
              error={errors.email && touched.email ? errors.email : undefined}
              isRequired
              name="email"
              id="email"
            />

            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(value) => handleChange('password', value)}
              placeholder="Enter your password"
              error={errors.password || undefined}
              isRequired
              name="password"
              id="password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              rightIcon={<ArrowRightIcon />}
              className="w-full"
              isLoading={signInMutation.isPending}
              loadingText="Signing In..."
            >
              Sign In
            </Button>
          </Box>
        </form>

        {/* Horizontal Separator */}
        <Box
          as="hr"
          my={8}
          border="none"
          borderTop="1px solid"
          borderColor={COLORS.neutral[200]}
        />

        {/* Google OAuth and Signup */}
        <Box display="flex" flexDirection="column" gap={4}>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleGoogleSignIn}
            isLoading={googleOAuthMutation.isPending}
            loadingText="Redirecting to Google..."
            leftIcon={
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            }
          >
            Continue with Google
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              navigate({
                to: '/create-profile',
                search: { from: 'signin', step: '1', token: '' },
              })
            }}
          >
            Create Account
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default SigninForm
