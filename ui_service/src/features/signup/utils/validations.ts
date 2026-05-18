import { ZodError, z } from 'zod'

// User Profile Form Validation Schema
export const userProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be less than 15 digits')
    .regex(/^\+?[\d\s-()]+$/, 'Please enter a valid phone number'),
  
  city: z
    .string()
    .min(2, 'City must be at least 2 characters long')
    .max(50, 'City must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'City can only contain letters and spaces'),
  
  profileType: z
    .string()
    .min(1, 'Profile type is required')
    .refine((val) => ['judge', 'lawyer', 'law-firm', 'law-student'].includes(val), {
      message: 'Please select a valid profile type'
    })
})

// Professional Details Form Validation Schemas

// Judge Profile Schema
export const judgeProfileSchema = z.object({
  courtName: z
    .string()
    .min(3, 'Court name must be at least 3 characters long')
    .max(100, 'Court name must be less than 100 characters'),
  
  designation: z
    .enum(['district-judge', 'high-court-judge'])
    .refine((val) => ['district-judge', 'high-court-judge'].includes(val), {
      message: 'Please select a valid designation'
    }),
  
  experience: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Experience must be a positive number'
    })
    .refine((val) => Number(val) <= 50, {
      message: 'Experience cannot exceed 50 years'
    }),
  
  jurisdiction: z
    .string()
    .min(3, 'Jurisdiction must be at least 3 characters long')
    .max(100, 'Jurisdiction must be less than 100 characters'),
  
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
})

// Lawyer Profile Schema
export const lawyerProfileSchema = z.object({
  barNumber: z
    .string()
    .min(3, 'Bar registration number must be at least 3 characters')
    .max(20, 'Bar registration number must be less than 20 characters')
    .regex(/^[A-Z0-9/]+$/, 'Bar number format is invalid'),
  
  specialization: z
    .enum(['criminal', 'civil', 'corporate'])
    .refine((val) => ['criminal', 'civil', 'corporate'].includes(val), {
      message: 'Please select a valid specialization'
    }),
  
  practiceYears: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Practice years must be a positive number'
    })
    .refine((val) => Number(val) <= 50, {
      message: 'Practice years cannot exceed 50 years'
    }),
  
  affiliatedFirm: z
    .string()
    .max(100, 'Firm name must be less than 100 characters')
    .optional(),
  
  linkedin: z
    .string()
    .url('Please enter a valid LinkedIn URL')
    .optional()
    .or(z.literal('')),
  
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
})

// Law Firm Profile Schema
export const lawFirmProfileSchema = z.object({
  firmName: z
    .string()
    .min(3, 'Firm name must be at least 3 characters long')
    .max(100, 'Firm name must be less than 100 characters'),
  
  estYear: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 1800, {
      message: 'Establishment year must be a valid year after 1800'
    })
    .refine((val) => Number(val) <= new Date().getFullYear(), {
      message: 'Establishment year cannot be in the future'
    }),
  
  practiceAreas: z
    .string()
    .min(3, 'Practice areas must be at least 3 characters long')
    .max(200, 'Practice areas must be less than 200 characters'),
  
  locations: z
    .string()
    .min(3, 'Office locations must be at least 3 characters long')
    .max(200, 'Office locations must be less than 200 characters'),
  
  firmSize: z
    .enum(['50-100', '100-200'])
    .refine((val) => ['50-100', '100-200'].includes(val), {
      message: 'Please select a valid firm size'
    }),
  
  website: z
    .string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal(''))
})

// Law Student Profile Schema
export const lawStudentProfileSchema = z.object({
  college: z
    .string()
    .min(3, 'College name must be at least 3 characters long')
    .max(100, 'College name must be less than 100 characters'),
  
  year: z
    .string()
    .min(1, 'Current year/semester is required')
    .max(20, 'Year/semester must be less than 20 characters'),
  
  courseType: z
    .enum(['llb', 'ba-llb'])
    .refine((val) => ['llb', 'ba-llb'].includes(val), {
      message: 'Please select a valid course type'
    }),
  
  gradYear: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= new Date().getFullYear(), {
      message: 'Graduation year must be current year or later'
    })
    .refine((val) => Number(val) <= new Date().getFullYear() + 10, {
      message: 'Graduation year cannot be more than 10 years in the future'
    }),
  
  academicInterests: z
    .string()
    .max(200, 'Academic interests must be less than 200 characters')
    .optional()
})

// Combined schema type for all professional details
export const professionalDetailsSchemas = {
  judge: judgeProfileSchema,
  lawyer: lawyerProfileSchema,
  'law-firm': lawFirmProfileSchema,
  'law-student': lawStudentProfileSchema
}

// Type exports
export type UserProfileFormData = z.infer<typeof userProfileSchema>
export type JudgeProfileData = z.infer<typeof judgeProfileSchema>
export type LawyerProfileData = z.infer<typeof lawyerProfileSchema>
export type LawFirmProfileData = z.infer<typeof lawFirmProfileSchema>
export type LawStudentProfileData = z.infer<typeof lawStudentProfileSchema>

// Utility function to get the appropriate schema for a profile type
export const getProfessionalDetailsSchema = (profileType: string) => {
  const schemas = {
    judge: judgeProfileSchema,
    lawyer: lawyerProfileSchema,
    'law-firm': lawFirmProfileSchema,
    'law-student': lawStudentProfileSchema
  } as const
  
  return schemas[profileType as keyof typeof schemas]
}

// Validation helper function
export const validateUserProfile = (data: any) => {
  try {
    return {
      success: true,
      data: userProfileSchema.parse(data),
      errors: {}
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string> = {}
      error.issues.forEach((err) => {
        if (err.path.length > 0) {
          const fieldName = err.path[0]
          if (typeof fieldName === 'string') {
            errors[fieldName] = err.message
          }
        }
      })
      return {
        success: false,
        data: null,
        errors
      }
    }
    return {
      success: false,
      data: null,
      errors: { general: 'Validation failed' }
    }
  }
}

export const validateProfessionalDetails = (profileType: string, data: any) => {
  // Validate profile type first
  if (!['judge', 'lawyer', 'law-firm', 'law-student'].includes(profileType)) {
    return {
      success: false,
      data: null,
      errors: { general: 'Invalid profile type' }
    }
  }

  const schema = getProfessionalDetailsSchema(profileType)

  try {
    return {
      success: true,
      data: schema.parse(data),
      errors: {}
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string> = {}
      error.issues.forEach((err) => {
        if (err.path.length > 0) {
          const fieldName = err.path[0]
          if (typeof fieldName === 'string') {
            errors[fieldName] = err.message
          }
        }
      })
      return {
        success: false,
        data: null,
        errors
      }
    }
    return {
      success: false,
      data: null,
      errors: { general: 'Validation failed' }
    }
  }
}