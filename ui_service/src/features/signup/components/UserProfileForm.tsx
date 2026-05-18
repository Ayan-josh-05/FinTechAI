import { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Container,
  Grid,
  GridItem,
  Input as ChakraInput,
  InputGroup,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { Input } from '@/features/shared/components/Input'
import SelectComponent from '@/features/shared/components/Select'
import { COLORS, STYLES } from '@/features/shared/constants/StyleConstants'
import { INDIAN_CITIES } from '@/constants/cities'
import { checkEmailExists } from '@/features/Auth/api'

export interface UserProfileFormProps {
  form: {
    name: string
    email: string
    phone: string
    city: string
    profileType: string
    password?: string
    confirmPassword?: string
  }
  profileTypes: Array<{ value: string; label: string }>
  apiDisabled: boolean
  validationErrors?: Record<string, string>
  onChange: (field: string, value: string) => void
  onEmailValidationChange?: (hasError: boolean) => void
  showPasswordFields?: boolean
  isFromOAuth?: boolean
}

const UserProfileForm = ({
  form,
  profileTypes,
  validationErrors = {},
  onChange,
  onEmailValidationChange,
  showPasswordFields = false,
  isFromOAuth = false,
}: UserProfileFormProps) => {
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredCities, setFilteredCities] = useState<Array<{ value: string; label: string }>>([])
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [emailCheckTimer, setEmailCheckTimer] = useState<NodeJS.Timeout | null>(null)

  const handleCityInputChange = (value: string) => {
    onChange('city', value)
    
    if (value.trim().length > 0) {
      // Filter cities based on input
      const filtered = INDIAN_CITIES.filter((city) =>
        city.label.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10) // Limit to 10 suggestions
      
      setFilteredCities(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setFilteredCities([])
      setShowSuggestions(false)
    }
  }

  const handleCitySelect = (cityLabel: string) => {
    onChange('city', cityLabel)
    setShowSuggestions(false)
    setFilteredCities([])
  }

  const handleConfirmPasswordBlur = useCallback(() => {
    if (form.confirmPassword && form.password !== form.confirmPassword) {
      setLocalErrors((prev) => ({
        ...prev,
        confirmPassword: 'Passwords do not match',
      }))
    } else {
      setLocalErrors((prev) => {
        const { confirmPassword, ...rest } = prev
        return rest
      })
    }
  }, [form.confirmPassword, form.password])

  // Debounced email validation
  const checkEmailUniqueness = useCallback(async (email: string) => {
    // Skip if OAuth user (email is pre-filled and authenticated)
    if (isFromOAuth) {
      // Clear any email errors for OAuth users
      setLocalErrors((prev) => {
        const { email, ...rest } = prev
        return rest
      })
      return
    }

    // Validate email format first
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return
    }

    setIsCheckingEmail(true)
    
    try {
      const result = await checkEmailExists(email)
      
      if (result.error) {
        // Handle 422 error - invalid email format
        setLocalErrors((prev) => ({
          ...prev,
          email: result.error!,
        }))
      } else if (result.exists) {
        // Handle 409 error - email already exists
        setLocalErrors((prev) => ({
          ...prev,
          email: 'This email is already registered. Please use a different email or sign in.',
        }))
      } else {
        // SUCCESS: Clear email error when email is available
        setLocalErrors((prev) => {
          const { email, ...rest } = prev
          return rest
        })
      }
    } catch (error) {
      console.error('Error checking email existence:', error)
      // Don't show error to user for API failures
      // Clear email error on API failure to not block user
      setLocalErrors((prev) => {
        const { email, ...rest } = prev
        return rest
      })
    } finally {
      setIsCheckingEmail(false)
    }
  }, [isFromOAuth])

  // Effect to handle debounced email checking
  useEffect(() => {
    // Clear any existing timer
    if (emailCheckTimer) {
      clearTimeout(emailCheckTimer)
    }

    // Skip if no email or OAuth user
    if (!form.email || isFromOAuth) {
      setIsCheckingEmail(false)
      return
    }

    // Set new timer for debounced check
    const timer = setTimeout(() => {
      checkEmailUniqueness(form.email)
    }, 500)

    setEmailCheckTimer(timer)

    // Cleanup
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [form.email, isFromOAuth, checkEmailUniqueness])

  const confirmPasswordError =
    validationErrors.confirmPassword || localErrors.confirmPassword
  
  const emailError = validationErrors.email || localErrors.email

  // Notify parent component about email validation status
  useEffect(() => {
    if (onEmailValidationChange) {
      onEmailValidationChange(!!emailError)
    }
  }, [emailError, onEmailValidationChange])

  return (
    <Container maxW="2xl" p={0}>
      <VStack gap={6} align="stretch">
        {/* Header Section */}
        <Box textAlign="center" pb={4}>
          <Text
            fontSize="2xl"
            color={COLORS.neutral[800]}
            mb={2}
            {...STYLES.font.bold}
          >
            User Profile
          </Text>
          <Text
            fontSize="md"
            color={COLORS.text.secondary}
            maxW="md"
            mx="auto"
            lineHeight="1.5"
          >
            Let's start with your basic information to create your profile
          </Text>
        </Box>

        {/* Form Section */}
        <Box as="form" w="full">
          <VStack gap={6} align="stretch">
            {/* Full Name - Full Width */}
            <Box w="full">
              <Box
                as="label"
                {...STYLES.form.label.base}
                {...STYLES.form.label.required}
              >
                Full Name
              </Box>
              <ChakraInput
                placeholder="Enter your full name"
                value={form.name}
                onChange={(e) => onChange('name', e.target.value)}
                disabled={isFromOAuth}
                {...STYLES.form.input.base}
                {...(validationErrors.name
                  ? STYLES.form.input.error
                  : STYLES.form.input.focus)}
                {...(isFromOAuth ? STYLES.form.input.disabled : {})}
              />
              {validationErrors.name && (
                <Box {...STYLES.form.error.base}>{validationErrors.name}</Box>
              )}
            </Box>

            {/* Email - Full Width */}
            <Box w="full">
              <Box
                as="label"
                {...STYLES.form.label.base}
                {...STYLES.form.label.required}
              >
                Email Address
              </Box>
              <Box position="relative">
                <ChakraInput
                  placeholder="your.email@example.com"
                  value={form.email}
                  onChange={(e) => onChange('email', e.target.value)}
                  disabled={isFromOAuth}
                  type="email"
                  {...STYLES.form.input.base}
                  {...(emailError
                    ? STYLES.form.input.error
                    : STYLES.form.input.focus)}
                  {...(isFromOAuth ? STYLES.form.input.disabled : {})}
                />
                {isCheckingEmail && !isFromOAuth && (
                  <Box
                    position="absolute"
                    right={3}
                    top="50%"
                    transform="translateY(-50%)"
                  >
                    <Spinner size="sm" color={COLORS.primary[500]} />
                  </Box>
                )}
              </Box>
              {isCheckingEmail && !isFromOAuth && (
                <Text fontSize="xs" color={COLORS.text.secondary} mt={1}>
                  Checking email availability...
                </Text>
              )}
              {emailError && (
                <Box {...STYLES.form.error.base}>{emailError}</Box>
              )}
            </Box>

            {/* Phone and City - Two Columns */}
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
              <GridItem>
                <Box>
                  <Box
                    as="label"
                    {...STYLES.form.label.base}
                    {...STYLES.form.label.required}
                  >
                    Phone Number
                  </Box>
                  <InputGroup startAddon="+91">
                    <ChakraInput
                      placeholder="1234567890"
                      value={form.phone}
                      onChange={(e) => onChange('phone', e.target.value)}
                      type="tel"
                      {...STYLES.form.input.base}
                      {...(validationErrors.phone
                        ? STYLES.form.input.error
                        : STYLES.form.input.focus)}
                    />
                  </InputGroup>
                  {validationErrors.phone && (
                    <Box {...STYLES.form.error.base}>
                      {validationErrors.phone}
                    </Box>
                  )}
                </Box>
              </GridItem>
              <GridItem>
                <Box position="relative">
                  <Box
                    as="label"
                    {...STYLES.form.label.base}
                    {...STYLES.form.label.required}
                  >
                    City
                  </Box>
                  <ChakraInput
                    placeholder="Enter your city"
                    value={form.city}
                    onChange={(e) => handleCityInputChange(e.target.value)}
                    onFocus={() => {
                      if (form.city.trim().length > 0) {
                        const filtered = INDIAN_CITIES.filter((city) =>
                          city.label.toLowerCase().includes(form.city.toLowerCase())
                        ).slice(0, 10)
                        setFilteredCities(filtered)
                        setShowSuggestions(filtered.length > 0)
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow click events to fire
                      setTimeout(() => setShowSuggestions(false), 200)
                    }}
                    {...STYLES.form.input.base}
                    {...(validationErrors.city
                      ? STYLES.form.input.error
                      : STYLES.form.input.focus)}
                  />
                  {showSuggestions && filteredCities.length > 0 && (
                    <Box
                      position="absolute"
                      top="100%"
                      left={0}
                      right={0}
                      bg="white"
                      border="1px solid"
                      borderColor={COLORS.neutral[200]}
                      borderRadius="md"
                      boxShadow="lg"
                      maxH="200px"
                      overflowY="auto"
                      zIndex={50}
                      mt={1}
                    >
                      {filteredCities.map((city) => (
                        <Box
                          key={city.value}
                          px={3}
                          py={2}
                          fontSize="sm"
                          cursor="pointer"
                          _hover={{ bg: 'blue.50' }}
                          onClick={() => handleCitySelect(city.label)}
                        >
                          {city.label}
                        </Box>
                      ))}
                    </Box>
                  )}
                  {validationErrors.city && (
                    <Box {...STYLES.form.error.base}>
                      {validationErrors.city}
                    </Box>
                  )}
                </Box>
              </GridItem>
            </Grid>

            {/* Profile Type - Full Width */}
            <Box w="full">
              <SelectComponent
                options={profileTypes}
                label="Profile Type"
                placeholder="Select your profile type"
                value={form.profileType}
                onChange={(v) => onChange('profileType', v)}
                isRequired
              />
              {validationErrors.profileType && (
                <Text color={COLORS.error[500]} fontSize="xs" mt={1}>
                  {validationErrors.profileType}
                </Text>
              )}
            </Box>

            {/* Password Fields - Only show when showPasswordFields is true */}
            {showPasswordFields && (
              <>
                {/* Password - Full Width */}
                <Box w="full">
                  <Input
                    label="Create Password"
                    placeholder="Enter your password"
                    value={form.password || ''}
                    onChange={(value) => onChange('password', value)}
                    type="password"
                    error={validationErrors.password}
                    isRequired
                    helperText="Min 8 chars: lowercase, uppercase, digit, special char (@#$%^&+=)"
                  />
                </Box>

                {/* Confirm Password - Full Width */}
                <Box w="full">
                  <Input
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    value={form.confirmPassword || ''}
                    onChange={(value) => onChange('confirmPassword', value)}
                    onBlur={handleConfirmPasswordBlur}
                    type="password"
                    error={confirmPasswordError}
                    isRequired
                  />
                </Box>
              </>
            )}
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
}

export default UserProfileForm
