import React, { useState } from 'react'
import { Box, Button, ButtonGroup, Steps, Text } from '@chakra-ui/react'
import { ArrowRightIcon } from '@/features/shared/icons/ArrowRightIcon'
import {
  COMPONENT_STYLES,
  STYLES,
} from '@/features/shared/constants/StyleConstants'

export interface WizardStep {
  id: string
  title: string
  description?: string
  component: React.ReactNode
  isOptional?: boolean
}

export interface WizardProps {
  steps: Array<WizardStep>
  onComplete?: (completedSteps: Array<string>) => void
  onStepChange?: (currentStep: number, stepId: string) => void
  showStepNumbers?: boolean
  allowStepNavigation?: boolean
  className?: string
  initialStep?: number
  // New props for dynamic behavior
  isStepValid?: (stepIndex: number) => boolean
  getNextButtonText?: (stepIndex: number) => string
  onFinalStepAction?: () => Promise<void> | void
  onBeforeStepChange?: (currentStepIndex: number) => boolean | Promise<boolean>
  isLoading?: boolean
  loadingText?: string
}

export const Wizard: React.FC<WizardProps> = ({
  steps,
  onStepChange,
  className = '',
  initialStep = 0,
  isStepValid,
  getNextButtonText,
  onFinalStepAction,
  onBeforeStepChange,
  isLoading = false,
  loadingText = 'Processing...',
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep)

  const handleStepChange = (stepIndex: number) => {
    setCurrentStep(stepIndex)
    if (onStepChange) {
      const stepId = steps[stepIndex]?.id ?? ''
      onStepChange(stepIndex, stepId)
    }
  }

  const handleNextClick = async () => {
    const isLastStep = currentStep === steps.length - 1
    
    // If moving from first step (step 0) to next step, validate first
    if (currentStep === 0 && !isLastStep && onBeforeStepChange) {
      const isValid = await onBeforeStepChange(currentStep)
      if (!isValid) {
        // Validation failed, don't proceed to next step
        return
      }
    }
    
    if (isLastStep && onFinalStepAction) {
      await onFinalStepAction()
    } else {
      const nextStep = Math.min(currentStep + 1, steps.length - 1)
      handleStepChange(nextStep)
    }
  }

  const handlePrevClick = () => {
    const prevStep = Math.max(currentStep - 1, 0)
    handleStepChange(prevStep)
  }

  const isCurrentStepValid = isStepValid ? isStepValid(currentStep) : true
  const nextButtonText = getNextButtonText ? getNextButtonText(currentStep) : 'Next'

  return (
    <Box {...COMPONENT_STYLES.Wizard.container} className={className}>
      <Steps.Root count={steps.length} step={currentStep}>
        {/* Step Headers */}
        <Steps.List>
          {steps.map((stepItem, index) => (
            <Steps.Item key={stepItem.id} index={index}>
              <Steps.Indicator />
              <Steps.Title>
                <Box {...STYLES.wizard.step.text.title.base}>
                  {stepItem.title}
                </Box>
              </Steps.Title>
              {stepItem.description && (
                <Text {...STYLES.wizard.step.text.description}>
                  {stepItem.description}
                </Text>
              )}
              <Steps.Separator />
            </Steps.Item>
          ))}
        </Steps.List>

        {/* Step Content */}
        {steps.map((stepItem, index) => (
          <Steps.Content key={stepItem.id} index={index}>
            <Box {...COMPONENT_STYLES.Wizard.content}>
              {stepItem.component}
            </Box>
          </Steps.Content>
        ))}

        {/* When All Steps Are Complete */}
        <Steps.CompletedContent>
          <Text textAlign="center" py={4}>
            All steps are complete!
          </Text>
        </Steps.CompletedContent>

        {/* Custom Navigation Buttons */}
        <ButtonGroup
          size="md"
          mt={6}
          justifyContent="space-between"
          width="100%"
        >
          <Button
            {...STYLES.button.outline}
            onClick={handlePrevClick}
            disabled={currentStep === 0}
            visibility={currentStep === 0 ? 'hidden' : 'visible'}
          >
            <Box mr={2}>
              <ArrowRightIcon size={16} rotate color="currentColor" />
            </Box>
            Previous
          </Button>

          <Button
            {...STYLES.button.primary}
            onClick={handleNextClick}
            disabled={!isCurrentStepValid}
            loading={isLoading}
            loadingText={loadingText}
          >
            {nextButtonText}
            <Box ml={2}>
              <ArrowRightIcon size={16} color="currentColor" />
            </Box>
          </Button>
        </ButtonGroup>
      </Steps.Root>
    </Box>
  )
}
