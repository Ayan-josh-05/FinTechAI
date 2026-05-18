import { useState } from 'react'
import {
  Box,
  VStack,
  Text,
  Textarea,
  Flex,
  CloseButton,
} from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { semanticSearchApi } from '@/features/SemanticSearch/api'
import { useSemanticSearchStore } from '@/features/SemanticSearch/store'
import { ToastNotifications } from '@/features/shared/components/ToastNotifications'
import { Button } from '@/features/shared/components'
import * as Sentry from '@sentry/tanstackstart-react'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  messageId: string
  jobId?: string
  existingFeedback?: string
}

const FeedbackModal = ({ isOpen, onClose, messageId, jobId, existingFeedback }: FeedbackModalProps) => {
  const [feedbackText, setFeedbackText] = useState(existingFeedback || '')
  const { setMessageFeedback } = useSemanticSearchStore()

  // Submit dislike feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: (feedbackText: string) =>
      Sentry.startSpan({ name: 'Submit dislike feedback' }, async () => {
        if (!jobId) throw new Error('Job ID is required for feedback submission')
        return semanticSearchApi.submitFeedback(jobId, 'dislike', feedbackText)
      }),
    onSuccess: (data) => {
      // Store feedback in local state
      setMessageFeedback(messageId, {
        reaction: 'dislike',
        feedbackText: feedbackText,
        feedbackId: data.id
      })
      
      ToastNotifications.success({
        title: data.message,
      })
      
      onClose()
      setFeedbackText('')
    },
    onError: (error) => {
      console.error('Failed to submit feedback:', error)
      ToastNotifications.error({
        title: 'Failed to submit feedback',
        description: 'Please try again later',
      })
    }
  })

  const handleSubmit = () => {
    if (!jobId) {
      ToastNotifications.error({
        title: 'Unable to submit feedback',
        description: 'Job ID not available',
      })
      return
    }

    if (!feedbackText.trim()) {
      ToastNotifications.error({
        title: 'Feedback required',
        description: 'Please provide your feedback before submitting',
      })
      return
    }

    submitFeedbackMutation.mutate(feedbackText.trim())
  }

  const handleClose = () => {
    onClose()
    setFeedbackText(existingFeedback || '')
  }

  if (!isOpen) return null

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      bg="blackAlpha.600"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex="modal"
    >
      <Box
        bg="white"
        borderRadius="lg"
        boxShadow="xl"
        maxW="md"
        w="90%"
        maxH="90vh"
        overflow="auto"
      >
        {/* Header */}
        <Flex justify="space-between" align="center" p={6} pb={4}>
          <Text fontSize="lg" fontWeight="semibold">
            Share your thoughts
          </Text>
          <CloseButton onClick={handleClose} />
        </Flex>
        
        {/* Body */}
        <Box px={6} pb={4}>
          <VStack align="stretch" gap={4}>
            <Text fontSize="sm" color="gray.600">
              Help us improve by sharing what went wrong with this response.
            </Text>
            
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tell us what went wrong..."
              rows={4}
              resize="vertical"
              borderColor="gray.300"
              _focus={{ borderColor: 'blue.500' }}
            />
          </VStack>
        </Box>

        {/* Footer */}
        <Flex justify="flex-end" gap={3} p={6} pt={4}>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={submitFeedbackMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={submitFeedbackMutation.isPending}
            disabled={submitFeedbackMutation.isPending || !feedbackText.trim()}
          >
            Submit Feedback
          </Button>
        </Flex>
      </Box>
    </Box>
  )
}

export default FeedbackModal
