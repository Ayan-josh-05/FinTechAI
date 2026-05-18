import { useEffect } from 'react'
import {
  Box,
  Flex,
  Grid,
  GridItem,
  HStack,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { FaEdit } from 'react-icons/fa'
import { useNavigate } from '@tanstack/react-router'
import { useUserProfile } from '../hooks'
import { useUserProfileStore } from '../store/userProfileStore'
import {
  transformFromApiFormat,
  getFrontendProfileType,
} from '@/features/Auth/utils/fieldMappings'
import ProfileSummary from './ProfileSummary'
import UserInformation from './UserInformation'
import JudgeDetails from './JudgeDetails'
import LawyerDetails from './LawyerDetails'
import LawFirmDetails from './LawFirmDetails'
import LawStudentDetails from './LawStudentDetails'
import { capitalize } from '@/features/shared/utils/stringUtils'
import { PageLayout } from '@/features/shared/layout/PageLayout'
import { COLORS, STYLES } from '@/features/shared/constants/StyleConstants'

const UserProfile: React.FC = () => {
  const { data: userData, isLoading, error } = useUserProfile()
  const { setUserData } = useUserProfileStore()
  const navigate = useNavigate()

  // Store user data in Zustand store when it's fetched
  useEffect(() => {
    if (userData) {
      setUserData(userData)
    }
  }, [userData, setUserData])

  // Handle edit profile navigation
  const handleEditProfile = () => {
    navigate({ to: '/edit-profile' as any })
  }

  // Show loading state
  if (isLoading) {
    return (
      <Box
        minH="100vh"
        bg={COLORS.neutral[50]}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack gap={4}>
          <Spinner size="xl" color={COLORS.primary[500]} />
          <Text color={COLORS.text.secondary}>Loading your profile...</Text>
        </VStack>
      </Box>
    )
  }

  // Show error state
  if (error) {
    return (
      <Box
        minH="100vh"
        bg={COLORS.neutral[50]}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack gap={4}>
          <Text color={COLORS.error[500]} fontSize="lg">
            Failed to load profile data
          </Text>
          <Text color={COLORS.text.secondary}>
            Please try refreshing the page
          </Text>
        </VStack>
      </Box>
    )
  }

  // Destructure userData for better readability
  const { city, email, full_name, phone, profile } = userData!

  // Extract profile type and professional details from API format
  const apiProfileType = profile.profile_type || '' // API format: 'Judge', 'Lawyer', etc.
  const apiProfessionalDetails = profile.fields || {} // API format: snake_case fields

  // Convert API profile type to frontend format
  const frontendProfileType = getFrontendProfileType(apiProfileType) // 'judge', 'lawyer', etc.
  
  // Transform API professional details to frontend format
  const professionalDetails = transformFromApiFormat(frontendProfileType, apiProfessionalDetails)

  // Extract data from API response with fallbacks
  const profileData = {
    name: full_name || '-',
    designation: professionalDetails.designation || '-',
    court: professionalDetails.courtName || '-',
    location: city || '-',
    fullName: full_name || '-',
    email: email || '-',
    phone: phone || '-',
    profileType: capitalize(frontendProfileType || '-'),
  }

  return (
    <PageLayout>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Box>
          <HStack alignItems="center" justifyContent="space-between" mb={2}>
            <Box>
              <Text
                fontSize="4xl"
                {...STYLES.font.bold}
                color={COLORS.text.primary}
              >
                Your Profile
              </Text>
              <Text fontSize="xl" color={COLORS.text.secondary}>
                Manage your professional profile information
              </Text>
            </Box>
            <Box>
              <Flex
                color={'white'}
                fontWeight={'semibold'}
                bgColor={'blue'}
                alignItems={'center'}
                gap={3}
                borderWidth={1}
                px={4}
                py={2}
                borderRadius={'md'}
                cursor={'pointer'}
                _hover={{ bgColor: 'blue.600' }}
                onClick={handleEditProfile}
              >
                <FaEdit />
                Edit Profile
              </Flex>
            </Box>
          </HStack>
        </Box>

        {/* Main Content Grid */}
        <Grid templateColumns={{ base: '1fr', lg: '1fr 2fr' }} gap={8}>
          {/* Left Column - Profile Summary */}
          <GridItem>
            <ProfileSummary
              name={profileData.name}
              designation={profileData.designation}
              court={profileData.court}
              location={profileData.location}
              profileType={profileData.profileType}
            />
          </GridItem>

          {/* Right Column - User Information */}
          <GridItem>
            <VStack gap={6} align="stretch">
              <UserInformation
                fullName={profileData.fullName}
                email={profileData.email}
                phone={profileData.phone}
                location={profileData.location}
              />

              {/* Profile-specific professional details */}
              {frontendProfileType === 'judge' && (
                <JudgeDetails details={professionalDetails} />
              )}
              {frontendProfileType === 'lawyer' && (
                <LawyerDetails details={professionalDetails} />
              )}
              {frontendProfileType === 'law-firm' && (
                <LawFirmDetails details={professionalDetails} />
              )}
              {frontendProfileType === 'law-student' && (
                <LawStudentDetails details={professionalDetails} />
              )}
            </VStack>
          </GridItem>
        </Grid>
      </VStack>
    </PageLayout>
  )
}

export default UserProfile
