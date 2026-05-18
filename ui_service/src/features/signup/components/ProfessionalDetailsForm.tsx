import React from 'react'
import { Box, Container, Text, VStack } from '@chakra-ui/react'
import { Input, TextArea } from '@/features/shared/components'
import SelectComponent from '@/features/shared/components/Select'
import { STYLES } from '@/features/shared/constants/StyleConstants'

import { COLORS } from '@/features/shared/constants/StyleConstants'
interface ProfessionalDetailsFormProps {
  profileType: string
  form: Record<string, string | undefined>
  validationErrors?: Record<string, string>
  onChange: (field: string, value: string) => void
}

type FieldConfig = {
  name: string
  label: string
  type?: 'text' | 'number' | 'url' | 'textarea' | 'select'
  placeholder?: string
  required?: boolean
  options?: Array<{ value: string; label: string }>
}

const profileFields: Record<string, Array<FieldConfig>> = {
  judge: [
    { name: 'courtName', label: 'Court Name', required: true },
    {
      name: 'designation',
      label: 'Designation',
      type: 'select',
      required: true,
      options: [
        { value: 'district-judge', label: 'District Judge' },
        { value: 'high-court-judge', label: 'High Court Judge' },
      ],
    },
    {
      name: 'experience',
      label: 'Years of Experience',
      type: 'number',
      required: true,
    },
    { name: 'jurisdiction', label: 'Jurisdiction Area', required: true },
    { name: 'bio', label: 'Professional Bio (Optional)', type: 'textarea' },
  ],
  lawyer: [
    { name: 'barNumber', label: 'Bar Registration Number', required: true },
    {
      name: 'specialization',
      label: 'Specialization Areas',
      type: 'select',
      required: true,
      options: [
        { value: 'criminal', label: 'Criminal' },
        { value: 'civil', label: 'Civil' },
        { value: 'corporate', label: 'Corporate' },
      ],
    },
    {
      name: 'practiceYears',
      label: 'Years of Practice',
      type: 'number',
      required: true,
    },
    { name: 'affiliatedFirm', label: 'Affiliated Firm (Optional)' },
    { name: 'linkedin', label: 'LinkedIn Profile URL (Optional)', type: 'url' },
    { name: 'bio', label: 'Professional Bio (Optional)', type: 'textarea' },
  ],
  'law-firm': [
    { name: 'firmName', label: 'Firm Name', required: true },
    {
      name: 'estYear',
      label: 'Establishment Year',
      type: 'number',
      required: true,
    },
    { name: 'practiceAreas', label: 'Practice Areas', required: true },
    { name: 'locations', label: 'Office Locations', required: true },
    {
      name: 'firmSize',
      label: 'Firm Size',
      type: 'select',
      required: true,
      options: [
        { value: '50-100', label: '50-100' },
        { value: '100-200', label: '100-200' },
      ],
    },
    { name: 'website', label: 'Website URL (Optional)', type: 'url' },
  ],
  'law-student': [
    { name: 'college', label: 'College/University Name', required: true },
    { name: 'year', label: 'Current Year/Semester', required: true },
    {
      name: 'courseType',
      label: 'Course Type',
      type: 'select',
      required: true,
      options: [
        { value: 'llb', label: 'LLB' },
        { value: 'ba-llb', label: 'BA LLB' },
      ],
    },
    {
      name: 'gradYear',
      label: 'Expected Graduation Year',
      type: 'number',
      required: true,
    },
    { name: 'academicInterests', label: 'Academic Interests (Optional)' },
  ],
}

export const ProfessionalDetailsForm: React.FC<
  ProfessionalDetailsFormProps
> = ({ profileType, form, validationErrors = {}, onChange }) => {
  const fields = profileFields[profileType] ?? []

  // Get profile type display name
  const getProfileTypeName = (type: string) => {
    const typeNames = {
      judge: 'Judge',
      lawyer: 'Lawyer',
      'law-firm': 'Law Firm',
      'law-student': 'Law Student',
    }
    return typeNames[type as keyof typeof typeNames] || type
  }

  return (
    <Container maxW="2xl" p={0}>
      <VStack gap={6} align="stretch">
        {/* Header Section */}
        <Box textAlign="center" pb={4}>
          <Text fontSize="2xl" color={COLORS.neutral[800]} mb={2} {...STYLES.font.bold}>
            Professional Details
          </Text>
          <Text
            fontSize="md"
            color={COLORS.text.secondary}
            maxW="md"
            mx="auto"
            lineHeight="1.5"
          >
            {profileType
              ? `Complete your ${getProfileTypeName(profileType)} profile information`
              : 'Please select a profile type first'}
          </Text>
        </Box>

        {/* Form Section */}
        {fields.length > 0 ? (
          <Box as="form" w="full">
            <VStack gap={6} align="stretch">
              {fields.map((field) => (
                <Box key={field.name} w="full">
                  {field.type === 'select' ? (
                    <>
                      <SelectComponent
                        options={field.options || []}
                        label={field.label}
                        placeholder="Select option"
                        value={form[field.name] || ''}
                        onChange={(value) => onChange(field.name, value)}
                        isRequired={field.required}
                      />
                      {validationErrors[field.name] && (
                        <Text color={COLORS.error[500]} fontSize="xs" mt={1}>
                          {validationErrors[field.name]}
                        </Text>
                      )}
                    </>
                  ) : field.type === 'textarea' ? (
                    <TextArea
                      label={field.label}
                      value={form[field.name] || ''}
                      onChange={(value) => onChange(field.name, value)}
                      placeholder={field.placeholder}
                      isRequired={field.required}
                      error={validationErrors[field.name]}
                    />
                  ) : (
                    <Input
                      label={field.label}
                      type={field.type || 'text'}
                      value={form[field.name] || ''}
                      onChange={(value) => onChange(field.name, value)}
                      placeholder={field.placeholder}
                      isRequired={field.required}
                      error={validationErrors[field.name]}
                    />
                  )}
                </Box>
              ))}
            </VStack>
          </Box>
        ) : (
          <Box textAlign="center" py={8}>
            <Text color={COLORS.text.tertiary} fontSize="md">
              Please select a profile type to continue
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  )
}

export default ProfessionalDetailsForm
