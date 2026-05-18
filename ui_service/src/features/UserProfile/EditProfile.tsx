import { useEffect, useState } from 'react'
import { Box, Text } from '@chakra-ui/react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import * as Sentry from '@sentry/tanstackstart-react'
import { useUserProfileStore } from './store/userProfileStore'
import {
  transformToApiFormat,
  getApiProfileType,
  transformFromApiFormat,
  getFrontendProfileType,
} from '@/features/Auth/utils/fieldMappings'
import type {
  GetCurrentUserResponse,
  UpdateUserProfileRequest,
} from '@/features/Auth/api'
import { useGetCurrentUser, useUpdateUserProfile } from '@/features/Auth/hooks'
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

// Define required fields for each profile type's professional details
const professionalRequiredFields: Record<string, Array<string>> = {
  judge: ['courtName', 'designation', 'experience', 'jurisdiction'],
  lawyer: ['barNumber', 'specialization', 'practiceYears'],
  'law-firm': ['firmName', 'estYear', 'practiceAreas', 'locations', 'firmSize'],
  'law-student': ['college', 'year', 'courseType', 'gradYear'],
}

type FormState = {
  name: string
  email: string
  phone: string
  city: string
  profileType: string
  [key: string]: string | undefined // Allow dynamic professional fields
}

function EditProfile() {
  const navigate = useNavigate({ from: '/edit-profile' })
  const { userData, setUserData } = useUserProfileStore()
  const queryClient = useQueryClient()

  // TanStack Query mutations
  const getCurrentUserMutation = useGetCurrentUser()
  const updateUserProfileMutation = useUpdateUserProfile()

  // Initialize form with user data from store or fetch if not available
  const [form, setForm] = useState<FormState>(() => {
    if (userData) {
      return initializeFormFromUserData(userData)
    }
    return {
      name: '',
      email: '',
      phone: '',
      city: '',
      profileType: '',
    }
  })

  // Initialize form data from user data
  function initializeFormFromUserData(data: GetCurrentUserResponse): FormState {
    // Remove +91 prefix from phone if it exists for display in the form
    const phoneNumber =
      data.phone && data.phone.startsWith('+91')
        ? data.phone.substring(3)
        : data.phone || ''

    // Extract profile type and professional details from API format
    const apiProfileType = data.profile.profile_type || ''
    const frontendProfileType = getFrontendProfileType(apiProfileType)

    const baseForm = {
      name: data.full_name || '',
      email: data.email || '',
      phone: phoneNumber,
      city: data.city || '',
      profileType: frontendProfileType,
    }

    // Add professional fields based on profile type
    if (frontendProfileType) {
      const professionalFields = getProfessionalFieldsFromProfile(
        data.profile,
        frontendProfileType,
      )
      return { ...baseForm, ...professionalFields }
    }

    return baseForm
  }

  // Extract professional fields from profile data
  function getProfessionalFieldsFromProfile(
    profile: any,
    profileType: string,
  ): Record<string, string> {
    const fields: Record<string, string> = {}
    
    // Get professional details from the API fields object
    const apiFields = profile.fields || {}

    // Transform API fields to frontend format
    const transformedFields = transformFromApiFormat(profileType, apiFields)

    // Get all possible fields for the profile type (required + optional)
    // These should match the keys in FIELD_MAPPINGS from fieldMappings.ts
    const allFieldsForType: Record<string, string[]> = {
      judge: ['courtName', 'designation', 'experience', 'jurisdiction', 'bio'],
      lawyer: ['barNumber', 'specialization', 'practiceYears', 'affiliatedFirm', 'linkedin', 'bio'],
      'law-firm': ['firmName', 'estYear', 'practiceAreas', 'locations', 'firmSize', 'website'],
      'law-student': ['college', 'year', 'courseType', 'gradYear', 'academicInterests'],
    }

    // Get fields for the current profile type
    const fieldsToExtract = allFieldsForType[profileType] || []

    // Extract each field from transformed fields
    fieldsToExtract.forEach((fieldName) => {
      fields[fieldName] = transformedFields[fieldName] || ''
    })

    return fields
  }


  // Fetch user data if not available in store
  useEffect(() => {
    if (!userData && !getCurrentUserMutation.isPending) {
      Sentry.startSpan({ name: 'Fetching user data for edit profile' }, () => {
        getCurrentUserMutation.mutate(
          { showErrorNotification: false },
          {
            onSuccess: (data) => {
              setUserData(data)
              setForm(initializeFormFromUserData(data))
            },
            onError: (error) => {
              console.error('Failed to fetch user data:', error)
              navigate({ to: '/profile' })
            },
          },
        )
      })
    } else if (userData) {
      setForm(initializeFormFromUserData(userData))
    }
  }, [userData, getCurrentUserMutation.isPending])

  // Validation for User Profile (Step 1)
  const isUserProfileValid = (): boolean => {
    // For edit profile, name and email are disabled, so we only validate editable fields
    const requiredFields = ['phone', 'city', 'profileType']

    const basicValidation = requiredFields.every((field) => {
      const value = form[field]
      return Boolean(
        value && typeof value === 'string' && value.trim().length > 0,
      )
    })

    return basicValidation
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
    // Prevent changes to disabled fields (name and email)
    if (field === 'name' || field === 'email') {
      return
    }

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
          apiDisabled={false}
          onChange={handleFormChange}
          showPasswordFields={false}
          isFromOAuth={true} // This will disable Full name and email fields
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
  const handleStepChange = () => {
    // For edit profile, we don't need URL-based step management
    // This is handled internally by the Wizard component
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
      return 'Update Profile'
    }
    return 'Next'
  }

  // Helper function to extract professional details from form
  const getProfessionalDetails = () => {
    const professionalDetails: Record<string, any> = {}
    
    // Get all professional fields for the current profile type
    const allFieldsForType: Record<string, string[]> = {
      judge: ['courtName', 'designation', 'experience', 'jurisdiction', 'bio'],
      lawyer: ['barNumber', 'specialization', 'practiceYears', 'affiliatedFirm', 'linkedin', 'bio'],
      'law-firm': ['firmName', 'estYear', 'practiceAreas', 'locations', 'firmSize', 'website'],
      'law-student': ['college', 'year', 'courseType', 'gradYear', 'academicInterests'],
    }
    
    const allProfessionalFields = allFieldsForType[form.profileType] || []
    
    // Extract professional details from form
    allProfessionalFields.forEach((field) => {
      if (form[field]) {
        professionalDetails[field] = form[field]
      }
    })
    
    return professionalDetails
  }

  // Handle profile update API call
  const handleUpdateProfile = () => {
    Sentry.startSpan({ name: 'Updating user profile' }, () => {
      const professionalDetails = getProfessionalDetails()
      
      // Transform professional details to API format
      const apiProfessionalDetails = transformToApiFormat(form.profileType, professionalDetails)
      const apiProfileType = getApiProfileType(form.profileType)
      
      // Prepare update data
      const updateData: UpdateUserProfileRequest = {
        full_name: form.name,
        email: form.email,
        phone: `+91${form.phone}`,
        city: form.city,
        profile: {
          profile_type: apiProfileType,
          fields: apiProfessionalDetails, // Use transformed API format
        },
      }

      // Call the update profile mutation
      console.log('API Call: Updating user profile', {
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

            // Invalidate and refetch user profile query to ensure fresh data
            queryClient.invalidateQueries({ queryKey: ['user-profile'] })

            // Fetch updated user data and update the store
            getCurrentUserMutation.mutate(
              { showErrorNotification: false },
              {
                onSuccess: (updatedUserData) => {
                  setUserData(updatedUserData)
                  ToastNotifications.profileUpdated()
                  navigate({ to: '/profile' })
                },
                onError: (error) => {
                  console.error('Failed to fetch updated user data:', error)
                  ToastNotifications.profileUpdated()
                  navigate({ to: '/profile' })
                },
              },
            )
          },
          onError: (error: Error) => {
            console.log('API Error: Failed to update user profile', {
              error: error.message,
              endpoint: 'update-profile',
            })
          },
        },
      )
    })
  }

  // Show loading state while fetching user data
  if (!userData && getCurrentUserMutation.isPending) {
    return (
      <Box
        minH="100vh"
        bg={COLORS.neutral[50]}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color={COLORS.text.secondary}>Loading profile data...</Text>
      </Box>
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
            Edit Your Profile
          </Text>
          <Text fontSize="lg" opacity={0.9} color="black">
            Update your profile information (Name and email cannot be changed)
          </Text>
        </Box>

        {/* Wizard Content */}
        <Box p={{ base: 6, md: 8 }}>
          <Wizard
            steps={steps}
            initialStep={0}
            onStepChange={handleStepChange}
            isStepValid={isStepValid}
            getNextButtonText={getNextButtonText}
            onFinalStepAction={handleUpdateProfile}
            isLoading={updateUserProfileMutation.isPending}
            loadingText="Updating Profile..."
          />
        </Box>
      </Box>
    </Box>
  )
}

export default EditProfile
