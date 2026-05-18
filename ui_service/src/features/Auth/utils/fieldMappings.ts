// Field mappings between frontend camelCase and API snake_case
export const FIELD_MAPPINGS = {
  judge: {
    courtName: 'court_name',
    designation: 'designation',
    experience: 'experience',
    jurisdiction: 'jurisdiction_area',
    bio: 'professional_bio',
  },
  lawyer: {
    barNumber: 'bar_registration_number',
    specialization: 'specialization_area',
    practiceYears: 'years_of_practice',
    affiliatedFirm: 'affiliated_firm',
    linkedin: 'linkedIn_profile',
    bio: 'professional_bio',
  },
  'law-firm': {
    firmName: 'firm_name',
    estYear: 'establishment_year',
    practiceAreas: 'practice_area',
    locations: 'office_locations',
    firmSize: 'firm_size',
    website: 'website_url',
  },
  'law-student': {
    college: 'college_name',
    year: 'current_year',
    courseType: 'course_type',
    gradYear: 'expected_graduation_year',
    academicInterests: 'academic_interests',
  },
} as const

// Profile type mappings between frontend and API
export const PROFILE_TYPE_MAPPINGS = {
  'judge': 'Judge',
  'lawyer': 'Laywer', // Note: keeping the typo from your API
  'law-firm': 'Law Firm',
  'law-student': 'Law Student',
} as const

// Reverse mappings for API to frontend transformation
export const REVERSE_FIELD_MAPPINGS = Object.entries(FIELD_MAPPINGS).reduce(
  (acc, [profileType, mappings]) => {
    acc[profileType] = Object.entries(mappings).reduce(
      (fieldAcc, [frontendField, apiField]) => {
        fieldAcc[apiField] = frontendField
        return fieldAcc
      },
      {} as Record<string, string>
    )
    return acc
  },
  {} as Record<string, Record<string, string>>
)

// Reverse profile type mappings
export const REVERSE_PROFILE_TYPE_MAPPINGS = Object.entries(PROFILE_TYPE_MAPPINGS).reduce(
  (acc, [frontendType, apiType]) => {
    acc[apiType] = frontendType
    return acc
  },
  {} as Record<string, string>
)

// Transform frontend form data to API format
export const transformToApiFormat = (
  profileType: string,
  formData: Record<string, any>
): Record<string, any> => {
  const mappings = FIELD_MAPPINGS[profileType as keyof typeof FIELD_MAPPINGS]
  if (!mappings) return formData

  const transformed: Record<string, any> = {}
  
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      const apiKey = mappings[key as keyof typeof mappings] || key
      transformed[apiKey] = value
    }
  })

  return transformed
}

// Transform API data to frontend format
export const transformFromApiFormat = (
  profileType: string,
  apiData: Record<string, any>
): Record<string, any> => {
  const mappings = REVERSE_FIELD_MAPPINGS[profileType]
  if (!mappings) return apiData

  const transformed: Record<string, any> = {}
  
  Object.entries(apiData).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      const frontendKey = mappings[key] || key
      transformed[frontendKey] = value
    }
  })

  return transformed
}

// Get API profile type from frontend profile type
export const getApiProfileType = (frontendType: string): string => {
  return PROFILE_TYPE_MAPPINGS[frontendType as keyof typeof PROFILE_TYPE_MAPPINGS] || frontendType
}

// Get frontend profile type from API profile type
export const getFrontendProfileType = (apiType: string): string => {
  return REVERSE_PROFILE_TYPE_MAPPINGS[apiType] || apiType
}
