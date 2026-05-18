import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import { Box, Flex, Grid, GridItem, Text } from '@chakra-ui/react'
import { FiSave, FiSearch } from 'react-icons/fi'
import { SEARCH_TABS, TAB_FIELD_CONFIG, TEXT_CONTENT } from '../constants'
import { isTabActive } from '../utils/helpers'
import {
  formatField,
  validateField,
  validateTabFields,
} from '../utils/validation'
import { useSearchStore } from '../store'
import { useDistricts, useOptions } from '../hooks'
import type { SearchFormState } from '../types'
import { Button, Card, Input, Select } from '@/features/shared/components'
import { COLORS } from '@/features/shared/constants/StyleConstants'

interface SearchFormProps {
  onSearch?: (formData: SearchFormState) => void
  onSaveQuery?: (formData: SearchFormState) => void
  hasSearched?: boolean
  isLoading?: boolean
}

// Create dynamic OPTIONS_MAP inside component to access districts and API options
const createOptionsMap = (
  districts: Array<{ value: string; label: string }>,
  apiOptions: any,
) => ({
  CASE_TYPE_OPTIONS: apiOptions?.CASE_TYPE || [],
  COURT_OPTIONS: apiOptions?.COURTS || [],
  LEGAL_SECTION_OPTIONS: apiOptions?.SECTIONS || [],
  STATE_OPTIONS: apiOptions?.STATES || [],
  DISTRICT_OPTIONS: districts,
  DETAILED_CASE_TYPE_OPTIONS: apiOptions?.CASE_TYPE || [],
})

const SearchForm = memo(
  forwardRef(
    (
      { onSearch, onSaveQuery, isLoading, hasSearched }: SearchFormProps,
      ref,
    ) => {
      const { searchFormState, setSearchFormState, isSearchInitiated } =
        useSearchStore()
      const {
        districts,
        isLoading: isLoadingDistricts,
        fetchDistricts,
        clearDistricts,
      } = useDistricts()
      const { options: apiOptions, isLoading: isLoadingOptions } = useOptions()

      // Initialize form data from store or defaults
      const [formData, setFormData] = useState<SearchFormState>(() => ({
        activeTab: 'PAN No.', // First tab is always PAN No.
        caseType: '',
      }))

      // Update form data when store changes
      useEffect(() => {
        if (searchFormState) {
          // Ensure we have all required fields based on the tab
          const updatedFormData = {
            ...searchFormState,
            // Add default values based on tab
            caseType: ['PAN No.', 'Aadhaar No.'].includes(
              searchFormState.activeTab,
            )
              ? searchFormState.caseType || ''
              : searchFormState.caseType,
            state: ['Aadhaar No.', 'Section Wise', 'Case Type'].includes(
              searchFormState.activeTab,
            )
              ? searchFormState.state || ''
              : searchFormState.state,
            courtName: ['Judge Name', 'Case Type'].includes(
              searchFormState.activeTab,
            )
              ? searchFormState.courtName || ''
              : searchFormState.courtName,
            legalSection:
              searchFormState.activeTab === 'Section Wise'
                ? searchFormState.legalSection || ''
                : searchFormState.legalSection,
            detailedCaseType:
              searchFormState.activeTab === 'Case Type'
                ? searchFormState.detailedCaseType || ''
                : searchFormState.detailedCaseType,
          }

          setFormData(updatedFormData)
        }
      }, [searchFormState])

      const [validationErrors, setValidationErrors] = useState<
        Record<string, string>
      >({})
      const [pincodeAutoFilled, setPincodeAutoFilled] = useState(false)

      const handleTabClick = useCallback(
        (tab: string) => {
          // Clear all form data when switching tabs, keeping only the activeTab
          const defaultFormData: SearchFormState = {
            activeTab: tab,
          }

          // Set default values for specific tabs
          if (tab === 'PAN No.') {
            defaultFormData.caseType = ''
          } else if (tab === 'Aadhaar No.') {
            defaultFormData.caseType = ''
            defaultFormData.state = ''
          } else if (tab === 'Judge Name') {
            defaultFormData.courtName = ''
          } else if (tab === 'Section Wise') {
            defaultFormData.legalSection = ''
            defaultFormData.state = ''
          } else if (tab === 'Case Type') {
            defaultFormData.detailedCaseType = ''
            defaultFormData.courtName = ''
            defaultFormData.state = ''
          }

          setFormData(defaultFormData)
          setValidationErrors({})
          setPincodeAutoFilled(false)
          // Clear districts when switching away from Party Name and Address tab
          if (tab !== 'Party Name and Address') {
            clearDistricts()
          }
        },
        [clearDistricts],
      )

      const handleInputChange = useCallback(
        (field: keyof SearchFormState, value: string) => {
          // Debounce the store update
          const updateStore = () => {
            // Filter input based on field type
            let filteredValue = value

            // For Aadhaar number, only allow digits, spaces, and dashes
            if (field === 'aadhaarNumber') {
              filteredValue = value.replace(/[^\d\s-]/g, '')
            }

            // For PAN number, only allow alphanumeric characters
            if (field === 'panNumber') {
              filteredValue = value.replace(/[^A-Za-z0-9]/g, '')
            }

            // For advocate on record number, allow alphanumeric characters and forward slash
            if (field === 'advocateOnRecordNumber') {
              filteredValue = value.replace(/[^A-Za-z0-9/]/g, '')
            }

            // Format the value based on field type
            const formattedValue = formatField(field as string, filteredValue)

            // Update form data only
            setFormData((prev) => {
              const newData = { ...prev, [field]: formattedValue }

              // Clear district field when state changes in Party Name and Address tab
              if (
                field === 'state' &&
                prev.activeTab === 'Party Name and Address'
              ) {
                newData.district = ''
                setPincodeAutoFilled(false)
                // Fetch districts for the new state
                if (formattedValue && formattedValue.trim() !== '') {
                  fetchDistricts(formattedValue)
                } else {
                  clearDistricts()
                }
              }

              return newData
            })
          }

          // Execute the update
          updateStore()
        },
        [fetchDistricts, clearDistricts],
      )

      const handleInputBlur = useCallback(
        (field: keyof SearchFormState, value: string) => {
          // Validate the field on blur
          const validation = validateField(field as string, value)

          // Update validation errors
          setValidationErrors((prev) => {
            const newErrors = { ...prev }
            if (validation.isValid) {
              delete newErrors[field as string]
            } else {
              newErrors[field as string] = validation.error || 'Invalid input'
            }

            // Clear district validation errors when state changes
            if (
              field === 'state' &&
              formData.activeTab === 'Party Name and Address'
            ) {
              delete newErrors.district
            }

            return newErrors
          })
        },
        [formData.activeTab],
      )

      const handleInputBlurEvent = useCallback(
        (field: keyof SearchFormState) =>
          (e: React.FocusEvent<HTMLInputElement>) => {
            const value = e.target.value
            handleInputBlur(field, value)
          },
        [handleInputBlur],
      )

      // Sync form data to store after a delay
      useEffect(() => {
        if (!isSearchInitiated) {
          const timeoutId = setTimeout(() => {
            setSearchFormState(formData)
          }, 300)

          return () => clearTimeout(timeoutId)
        }
      }, [formData, isSearchInitiated, setSearchFormState])

      const handleSearch = useCallback(() => {
        // Validate all fields for the current tab
        const tabErrors = validateTabFields(formData.activeTab, formData)

        if (Object.keys(tabErrors).length > 0) {
          setValidationErrors(tabErrors)
          return
        }

        // Clear any existing validation errors
        setValidationErrors({})

        // Store the search state before triggering the search
        setSearchFormState(formData)
        onSearch?.(formData)
      }, [formData, setSearchFormState, onSearch])

      const handleSaveQuery = useCallback(() => {
        onSaveQuery?.(formData)
      }, [formData, onSaveQuery])

      // Check if all required fields are filled for the current tab
      const isSearchDisabled = useMemo(() => {
        const requiredFields: Record<string, Array<string>> = {
          'PAN No.': ['panNumber'],
          'Aadhaar No.': ['aadhaarNumber'],
          'Party Name and Address': ['personName'],
          'Section Wise': ['legalSection'],
          'Case / CNR No.': ['caseNumber'],
          'Advocate Name': ['advocateName'],
          'Judge Name': ['judgeName'],
          'Case Type': ['detailedCaseType'],
        }

        const tabRequiredFields = requiredFields[formData.activeTab] ?? []

        // If no required fields defined for this tab, search is not disabled
        if (tabRequiredFields.length === 0) {
          return false
        }

        return tabRequiredFields.some((field) => {
          const value = formData[field as keyof SearchFormState]
          return !value || value.trim() === ''
        })
      }, [formData])

      const { searchForm } = TEXT_CONTENT
      const currentTabConfig =
        TAB_FIELD_CONFIG[formData.activeTab as keyof typeof TAB_FIELD_CONFIG]

      const renderField = (fieldConfig: any) => {
        const { key, label, type, placeholder, options, helper } = fieldConfig

        // Define required fields for each tab
        const requiredFields: Record<string, Array<string>> = {
          'PAN No.': ['panNumber'],
          'Aadhaar No.': ['aadhaarNumber'],
          'Party Name and Address': ['personName'],
          'Section Wise': ['legalSection'],
          'Case / CNR No.': ['caseNumber'],
          'Advocate Name': ['advocateName'],
          'Judge Name': ['judgeName'],
          'Case Type': ['detailedCaseType'],
        }

        const tabRequiredFields = requiredFields[formData.activeTab] ?? []
        const isRequired = tabRequiredFields.includes(key)

        // Check if district field should be disabled (only enabled when state is selected in Party Name and Address tab)
        const isDistrictDisabled =
          key === 'district' &&
          formData.activeTab === 'Party Name and Address' &&
          (!formData.state || formData.state.trim() === '' || pincodeAutoFilled)

        // Check if state field should be disabled when pincode auto-fills it
        const isStateDisabled =
          key === 'state' &&
          formData.activeTab === 'Party Name and Address' &&
          pincodeAutoFilled

        // Create options map with current districts and API options
        const OPTIONS_MAP = createOptionsMap(districts, apiOptions)

        if (type === 'select') {
          const selectOptions = OPTIONS_MAP[options as keyof typeof OPTIONS_MAP]
          return (
            <GridItem key={key}>
              <Text
                fontSize="sm"
                fontWeight="medium"
                color={COLORS.neutral[700]}
                mb={2}
              >
                {label}
                {isRequired && (
                  <Text as="span" color={COLORS.error[500]} ml={1}>
                    *
                  </Text>
                )}
              </Text>
              <Select
                label=""
                value={(formData as any)[key] || ''}
                options={selectOptions}
                placeholder={
                  key === 'district' && isLoadingDistricts
                    ? 'Loading districts...'
                    : isDistrictDisabled
                      ? 'Select state first'
                      : isStateDisabled
                        ? 'Auto-filled from pincode'
                        : placeholder
                }
                onChange={(value) => {
                  handleInputChange(key as keyof SearchFormState, value)
                  // Validate on change for select components since they don't have onBlur
                  handleInputBlur(key as keyof SearchFormState, value)
                }}
                disabled={
                  isDistrictDisabled ||
                  isStateDisabled ||
                  (key === 'district' && isLoadingDistricts)
                }
              />
            </GridItem>
          )
        }

        const isFullWidth = helper || key === 'associatedEntity'

        return (
          <GridItem key={key} colSpan={isFullWidth ? 2 : 1}>
            <Box mb={helper && key !== 'aadhaarNumber' ? 6 : 0}>
              <Text
                fontSize="sm"
                fontWeight="medium"
                color={COLORS.neutral[700]}
                mb={2}
              >
                {label}
                {isRequired && (
                  <Text as="span" color={COLORS.error[500]} ml={1}>
                    *
                  </Text>
                )}
              </Text>
              <Input
                placeholder={
                  isDistrictDisabled
                    ? 'Select state first'
                    : isStateDisabled
                      ? 'Auto-filled from pincode'
                      : placeholder
                }
                label=""
                value={(formData as any)[key] || ''}
                onChange={(value) =>
                  handleInputChange(key as keyof SearchFormState, value)
                }
                onBlur={handleInputBlurEvent(key as keyof SearchFormState)}
                error={validationErrors[key]}
                disabled={isDistrictDisabled || isStateDisabled}
              />
              {helper && !validationErrors[key] && (
                <Text fontSize="xs" color={COLORS.text.tertiary} mt={1}>
                  {helper}
                </Text>
              )}
            </Box>
          </GridItem>
        )
      }

      useImperativeHandle(ref, () => ({
        resetForm: () => {
          // Only reset if there's no search form state
          if (!searchFormState) {
            const defaultFormData = {
              activeTab: 'PAN No.', // First tab is always PAN No.
              caseType: '',
            }
            setFormData(defaultFormData)
            setSearchFormState(defaultFormData)
            setValidationErrors({})
            setPincodeAutoFilled(false)
            clearDistricts()
          }
        },
        getFormData: () => formData,
      }))

      // Show loading state while options are being fetched
      if (isLoadingOptions) {
        return (
          <Card p={6} variant="elevated">
            <Box textAlign="center" py={8}>
              <Text color={COLORS.text.secondary}>
                Loading search options...
              </Text>
            </Box>
          </Card>
        )
      }

      return (
        <Card p={6} variant="elevated">
          <Box
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading && !isSearchDisabled) {
                e.preventDefault()
                handleSearch()
              }
            }}
          >
            {/* Navigation Tabs - underline style */}
            <Box mb={6}>
              <Flex
                borderBottom="1px"
                borderColor={COLORS.neutral[200]}
                gap={6}
                wrap="wrap"
              >
                {SEARCH_TABS.map((tab) => {
                  const active = isTabActive(formData.activeTab, tab)
                  return (
                    <Box
                      key={tab}
                      as="button"
                      pb={3}
                      pt={1}
                      px={1}
                      fontSize="sm"
                      fontWeight="medium"
                      color={
                        active ? COLORS.primary[600] : COLORS.text.secondary
                      }
                      borderBottom={active ? '2px solid' : '2px solid'}
                      borderColor={active ? COLORS.primary[600] : 'transparent'}
                      onClick={() => handleTabClick(tab)}
                      _hover={{
                        color: active
                          ? COLORS.primary[600]
                          : COLORS.neutral[800],
                      }}
                    >
                      {tab}
                    </Box>
                  )
                })}
              </Flex>
            </Box>

            {/* Dynamic Form Fields */}
            <Grid
              templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
              gap={6}
              mb={6}
            >
              {currentTabConfig.map((fieldConfig) => renderField(fieldConfig))}
            </Grid>

            {/* Action Buttons */}
            <Flex gap={4}>
              <Button
                leftIcon={<FiSearch />}
                onClick={handleSearch}
                isLoading={isLoading}
                loadingText="Searching..."
                disabled={isLoading || isSearchDisabled}
              >
                {searchForm.searchButton}
              </Button>
              {hasSearched && (
                <Button
                  variant="outline"
                  onClick={handleSaveQuery}
                  disabled={isLoading || isSearchDisabled}
                >
                  <Box as={FiSave} mr={2} />
                  {searchForm.saveQueryButton}
                </Button>
              )}
            </Flex>
          </Box>
        </Card>
      )
    },
  ),
)

SearchForm.displayName = 'SearchForm'

export default SearchForm
