import { useEffect, useState } from 'react'
import { Box, Link, Text } from '@chakra-ui/react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  useGetCurrentUser,
  useRegisterUser,
  useUpdateUserProfile,
} from './hooks'
import {
  showValidationErrors,
  validateRegistrationForm,
} from './utils/validation'
import {
  transformToApiFormat,
  getApiProfileType,
} from './utils/fieldMappings'
import type {
  GetCurrentUserResponse,
  RegisterRequest,
  UpdateUserProfileRequest,
} from './api'
import UserProfileForm from '@/features/signup/components/UserProfileForm'
import ProfessionalDetailsForm from '@/features/signup/components/ProfessionalDetailsForm'
import { Wizard } from '@/features/shared/components/Wizard'
import { ToastNotifications } from '@/features/shared/components/ToastNotifications'

import { COLORS } from '@/features/shared/constants/StyleConstants'

const profileTypes = [
  { value: 'judge', label: 'Judge' },
  { value: 'lawyer', label: 'Lawyer' },
  { value: 'law-firm', label: 'Law Firm' },
  { value: 'law-student', label: 'Law Student' },
]

type FormState = {
  name: string
  email: string
  phone: string
  city: string
  profileType: string
  password?: string
  confirmPassword?: string
  [key: string]: string | undefined // Allow dynamic professional fields
}

// Define required fields for each profile type's professional details
const professionalRequiredFields: Record<string, Array<string>> = {
  judge: ['courtName', 'designation', 'experience', 'jurisdiction'],
  lawyer: ['barNumber', 'specialization', 'practiceYears'],
  'law-firm': ['firmName', 'estYear', 'practiceAreas', 'locations', 'firmSize'],
  'law-student': ['college', 'year', 'courseType', 'gradYear'],
}

function CreateProfile() {
  const {
    token = '',
    step = '1',
    from = '',
  } = useSearch({ from: '/create-profile' })
  const navigate = useNavigate({ from: '/create-profile' })
  const currentStep = Number(step) - 1

  // Check if user came from signin page (has referrer in search params)
  const isFromSignIn = from === 'signin'
  // Check if user came from OAuth flow
  const isFromOAuth = from === 'oauth'

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    city: '',
    profileType: '',
    password: undefined,
    confirmPassword: undefined,
  })
  const [apiDisabled, setApiDisabled] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // TanStack Query mutations
  const registerMutation = useRegisterUser()
  const getCurrentUserMutation = useGetCurrentUser()
  const updateUserProfileMutation = useUpdateUserProfile()

  // OAuth form pre-fill tracking
  useEffect(() => {
    if (isFromOAuth && form.name && form.email) {
      // OAuth form successfully pre-filled
    }
  }, [form.name, form.email, isFromOAuth])

  // Set API disabled if token is present (for demo purposes)
  useEffect(() => {
    if (token) {
      setApiDisabled(true)
    }
  }, [token])

  const handleOAuthSuccess = (data: GetCurrentUserResponse) => {
    console.log('API Success: OAuth user data fetched successfully', {
      userId: data.id,
      email: data.email,
    })

    // Pre-fill form with user data from OAuth
    // Remove +91 prefix from phone if it exists for display in the form
    const phoneNumber =
      data.phone && data.phone.startsWith('+91')
        ? data.phone.substring(3)
        : data.phone || ''

    setForm((prev) => ({
      ...prev,
      name: data.full_name || '',
      email: data.email || '',
      phone: phoneNumber,
      city: data.city || '',
      // Keep other fields as they are or set defaults
    }))
  }

  // Handler function for OAuth user data fetching
  const handleOAuthUserData = () => {
    console.log('API Call: Fetching OAuth user data from /auth/me endpoint')

    // Use the mutation to get current user data for OAuth flow
    getCurrentUserMutation.mutate(
      { showErrorNotification: false },
      {
        onSuccess: handleOAuthSuccess,
        onError: (error) => {
          console.log('API Error: Failed to fetch OAuth user data', {
            error: error.message,
            endpoint: '/auth/me',
          })
          // Continue with normal flow even if API call fails
        },
      },
    )
  }

  // Handle OAuth redirect - call the handler function
  useEffect(() => {
    if (isFromOAuth && !getCurrentUserMutation.isPending) {
      handleOAuthUserData()
    }
  }, [isFromOAuth])

  // Validation for User Profile (Step 1)
  const isUserProfileValid = (): boolean => {
    const requiredFields = ['name', 'email', 'phone', 'city', 'profileType']

    // Add password validation if coming from signin (not OAuth)
    if (isFromSignIn && !isFromOAuth) {
      requiredFields.push('password', 'confirmPassword')
    }

    const basicValidation = requiredFields.every((field) => {
      const value = form[field]
      return Boolean(
        value && typeof value === 'string' && value.trim().length > 0,
      )
    })

    // Additional password confirmation validation (only for signin, not OAuth)
    const passwordValidation =
      !isFromSignIn ||
      isFromOAuth ||
      Boolean(
        form.password === form.confirmPassword &&
          form.password &&
          form.password.length >= 8,
      )

    // Check if there are any validation errors (including email errors from API)
    const hasNoValidationErrors = Object.keys(validationErrors || {}).length === 0

    return basicValidation && passwordValidation && hasNoValidationErrors
  }

  // Validation for Professional Details (Step 2)
  const isProfessionalDetailsValid = (): boolean => {
    if (!form.profileType) {
      return false
    }

    const requiredFields = professionalRequiredFields[form.profileType]
    return requiredFields.every((field) => {
      const value = form[field]
      return Boolean(
        value && typeof value === 'string' && value.trim().length > 0,
      )
    })
  }

  // Handler for form field changes
  const handleFormChange = (field: string, value: string) => {
    // Check if the field is 'phone'
    if (field === 'phone') {
      // Sanitize the input value to only allow digits (no +91 prefix needed as it's handled by the addon)
      const sanitizedValue = value.replace(/[^0-9]/g, '')
      setForm((f) => ({ ...f, [field]: sanitizedValue }))
    } else if (field === 'city') {
      // Sanitize city input to only allow letters, spaces, and common city name characters
      const sanitizedValue = value.replace(/[^a-zA-Z\s\-'.]/g, '')
      setForm((f) => ({ ...f, [field]: sanitizedValue }))
    } else {
      // For all other fields, update the state normally
      setForm((f) => ({ ...f, [field]: value }))
    }
  }

  // Steps
  const steps = [
    {
      id: 'user-profile',
      title: 'User Profile',
      component: (
        <UserProfileForm
          form={form}
          profileTypes={profileTypes}
          apiDisabled={apiDisabled}
          validationErrors={validationErrors}
          onChange={handleFormChange}
          showPasswordFields={isFromSignIn && !isFromOAuth}
          isFromOAuth={isFromOAuth}
        />
      ),
    },
    {
      id: 'professional-details',
      title: 'Professional Details',
      component: (
        <ProfessionalDetailsForm
          profileType={form.profileType}
          form={form}
          onChange={handleFormChange}
        />
      ),
    },
  ]

  // Wizard callback functions
  const handleStepChange = (newStepIndex: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        step: String(newStepIndex + 1), // converting index (0-based) to step (1-based)
      }),
    })
  }

  // Validate UserDetails form before moving to next step
  const validateUserDetailsStep = async (): Promise<boolean> => {
    const errors: string[] = []

    // Validate name
    if (!form.name || !form.name.trim()) {
      errors.push('Full name is required')
    }

    // Validate email
    if (!form.email || !form.email.trim()) {
      errors.push('Email is required')
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(form.email)) {
        errors.push('Please enter a valid email address')
      } else if (!isFromOAuth) {
        // Check email uniqueness only for non-OAuth users
        try {
          const { checkEmailExists } = await import('./api')
          const result = await checkEmailExists(form.email)
          if (result.exists) {
            errors.push('This email is already registered. Please use a different email or sign in.')
          } else if (result.error) {
            errors.push(result.error)
          }
          // If result.exists is false and no error, email is valid and available - clear any previous errors
          else {
            // Clear email validation errors from state
            setValidationErrors((prev) => {
              const { email, ...rest } = prev
              return rest
            })
          }
        } catch (error) {
          console.error('Error checking email existence:', error)
          // Continue with validation even if API call fails
        }
      }
    }

    // Validate phone
    if (!form.phone || !form.phone.trim()) {
      errors.push('Phone number is required')
    } else if (form.phone.length !== 10 || !/^\d{10}$/.test(form.phone)) {
      errors.push('Please enter a valid 10-digit phone number')
    }

    // Validate city
    if (!form.city || !form.city.trim()) {
      errors.push('City is required')
    } else {
      const cityRegex = /^[a-zA-Z\s\-'\.]+$/
      if (!cityRegex.test(form.city)) {
        errors.push('City name should only contain letters, spaces, hyphens, apostrophes, and periods')
      }
    }

    // Validate profile type
    if (!form.profileType) {
      errors.push('Profile type is required')
    }

    // Validate password fields if coming from signin (not OAuth)
    if (isFromSignIn && !isFromOAuth) {
      if (!form.password || !form.password.trim()) {
        errors.push('Password is required')
      } else {
        // Password strength validation
        if (form.password.length < 8) {
          errors.push('Password must be at least 8 characters long')
        }
        if (!/[a-z]/.test(form.password)) {
          errors.push('Password must contain at least one lowercase letter')
        }
        if (!/[A-Z]/.test(form.password)) {
          errors.push('Password must contain at least one uppercase letter')
        }
        if (!/\d/.test(form.password)) {
          errors.push('Password must contain at least one digit')
        }
        if (!/[@#$%^&+=]/.test(form.password)) {
          errors.push('Password must contain at least one special character (@#$%^&+=)')
        }
      }

      if (!form.confirmPassword || !form.confirmPassword.trim()) {
        errors.push('Please confirm your password')
      } else if (form.password !== form.confirmPassword) {
        errors.push('Passwords do not match')
      }
    }

    // Show validation errors if any
    if (errors.length > 0) {
      showValidationErrors(errors)
      return false
    }

    return true
  }

  // Check if current step is valid
  const isStepValid = (stepIndex: number) => {
    if (stepIndex === 0) {
      return isUserProfileValid()
    } else if (stepIndex === 1) {
      return isProfessionalDetailsValid()
    }
    return false
  }

  // Get dynamic button text
  const getNextButtonText = (stepIndex: number) => {
    if (stepIndex === steps.length - 1) {
      return 'Create Profile'
    }
    return 'Next'
  }

  // Helper function to extract professional details from form
  const getProfessionalDetails = () => {
    const professionalDetails: Record<string, any> = {}
    const requiredFields = professionalRequiredFields[form.profileType] || []
    
    // Get all professional fields for the current profile type
    const allProfessionalFields = [
      ...requiredFields,
      // Add optional fields based on profile type
      ...(form.profileType === 'judge' ? ['bio'] : []),
      ...(form.profileType === 'lawyer' ? ['affiliatedFirm', 'linkedin', 'bio'] : []),
      ...(form.profileType === 'law-firm' ? ['website'] : []),
      ...(form.profileType === 'law-student' ? ['academicInterests'] : []),
    ]
    
    // Extract professional details from form
    allProfessionalFields.forEach((field) => {
      if (form[field]) {
        professionalDetails[field] = form[field]
      }
    })
    
    return professionalDetails
  }

  // Handle profile creation API call
  const handleCreateProfile = () => {
    const professionalDetails = getProfessionalDetails()
    
    // Transform professional details to API format
    const apiProfessionalDetails = transformToApiFormat(form.profileType, professionalDetails)
    const apiProfileType = getApiProfileType(form.profileType)
    
    // For OAuth users, they're already authenticated, so we need to update their profile
    if (isFromOAuth) {
      // Prepare update data for OAuth users
      const updateData: UpdateUserProfileRequest = {
        full_name: form.name,
        email: form.email,
        phone: `+91${form.phone}`,
        city: form.city,
        profile: {
          profile_type: apiProfileType,
          fields: apiProfessionalDetails, 
        },
      }

      // Call the update profile mutation
      console.log('API Call: Updating user profile for OAuth user', {
        email: updateData.email,
        profileType: updateData.profile.profile_type,
        professionalDetails: apiProfessionalDetails,
      })
      updateUserProfileMutation.mutate(
        { data: updateData },
        {
          onSuccess: () => {
            console.log('API Success: User profile updated successfully', {
              email: updateData.email,
            })
            ToastNotifications.profileUpdated()
            navigate({ to: '/dashboard' })
          },
          onError: (error: Error) => {
            console.log('API Error: Failed to update user profile', {
              error: error.message,
              endpoint: 'update-profile',
            })
          },
        },
      )
      return
    }

    // Prepare registration data for non-OAuth users
    const registrationData: RegisterRequest = {
      email: form.email,
      password: form.password || '',
      full_name: form.name,
      phone: `+91${form.phone}`,
      city: form.city,
      profile: {
        profile_type: apiProfileType,
        fields: apiProfessionalDetails, // Use transformed API format
      },
    }

    // Validate form data
    const validation = validateRegistrationForm(registrationData)

    if (!validation.isValid) {
      showValidationErrors(validation.errors)
      return
    }

    // Call the registration mutation
    console.log('API Call: Registering new user', {
      email: registrationData.email,
      profileType: registrationData.profile.profile_type,
      professionalDetails: apiProfessionalDetails,
    })
    registerMutation.mutate(
      { data: registrationData },
      {
        onSuccess: () => {
          console.log('API Success: User registration completed successfully', {
            email: registrationData.email,
          })
          ToastNotifications.accountCreated()
          // Navigate to signin page after successful account creation
          navigate({ to: '/signin' })
        },
        onError: (error: Error) => {
          console.log('API Error: Failed to register user', {
            error: error.message,
            endpoint: 'register',
          })
          // The axios interceptor will handle most error notifications
          // We only need to handle success notifications here
        },
      },
    )
  }

  return (
    <Box
      minH="100vh"
      bg={COLORS.neutral[50]}
      py={{ base: 6, md: 12 }}
      px={{ base: 8, md: 8 }}
    >
      <Box
        maxW="4xl"
        mx="auto"
        bg="white"
        borderRadius="2xl"
        boxShadow="xl"
        overflow="hidden"
      >
        {/* Main Header */}
        <Box
          bg="gradient-to-r"
          bgGradient="linear(to-r, blue.500, blue.600)"
          color="white"
          textAlign="center"
          py={8}
          px={6}
        >
          <Text fontSize="3xl" fontWeight="bold" mb={2} color="black">
            {isFromSignIn
              ? 'Create Account'
              : isFromOAuth
                ? 'Complete Your Profile'
                : 'Create Your Profile'}
          </Text>
          <Text fontSize="lg" opacity={0.9} color="black">
            {isFromSignIn
              ? 'Sign up to join the legal community platform'
              : isFromOAuth
                ? 'Complete your profile to join the legal community platform'
                : 'Join the legal community platform'}
          </Text>
        </Box>

        {/* Wizard Content */}
        <Box p={{ base: 6, md: 8 }}>
          <Wizard
            steps={steps}
            initialStep={currentStep}
            onStepChange={handleStepChange}
            isStepValid={isStepValid}
            getNextButtonText={getNextButtonText}
            onFinalStepAction={handleCreateProfile}
            onBeforeStepChange={validateUserDetailsStep}
            isLoading={
              registerMutation.isPending ||
              getCurrentUserMutation.isPending ||
              updateUserProfileMutation.isPending
            }
            loadingText={
              getCurrentUserMutation.isPending
                ? 'Loading user data...'
                : updateUserProfileMutation.isPending
                  ? 'Updating Profile...'
                  : 'Creating Profile...'
            }
          />

          {/* Back to Sign In Link */}
          {isFromSignIn && !isFromOAuth && (
            <Box textAlign="center" mt={6} pt={6} borderTop="1px solid" borderColor={COLORS.neutral[200]}>
              <Text fontSize="sm" color={COLORS.text.secondary}>
                You already have an account?{' '}
                <Link
                  onClick={() => navigate({ to: '/signin' })}
                  color={COLORS.primary[600]}
                  fontWeight="medium"
                  cursor="pointer"
                  _hover={{ textDecoration: 'underline', color: COLORS.primary[700] }}
                >
                  Login
                </Link>
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default CreateProfile
