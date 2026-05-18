import { useState } from 'react'
import { Box, Flex } from '@chakra-ui/react'
import { FiThumbsUp, FiThumbsDown } from 'react-icons/fi'
import { FaThumbsUp, FaThumbsDown } from 'react-icons/fa'
import { useMutation } from '@tanstack/react-query'
import { semanticSearchApi } from '@/features/SemanticSearch/api'
import { useSemanticSearchStore } from '@/features/SemanticSearch/store'
import type { ChatMessage } from '@/features/SemanticSearch/store/useSemanticSearchStore'
import { ToastNotifications } from '@/features/shared/components/ToastNotifications'
import * as Sentry from '@sentry/tanstackstart-react'

interface FeedbackButtonsProps {
  messageId: string
  jobId?: string
  currentFeedback?: ChatMessage['feedback']
  onDislikeClick: () => void
}

const FeedbackButtons = ({ messageId, jobId, currentFeedback, onDislikeClick }: FeedbackButtonsProps) => {
  const { setMessageFeedback, clearMessageFeedback } = useSemanticSearchStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: ({ reaction, feedbackText }: { reaction: 'like' | 'dislike', feedbackText?: string }) =>
      Sentry.startSpan({ name: 'Submit feedback' }, async () => {
        if (!jobId) throw new Error('Job ID is required for feedback submission')
        return semanticSearchApi.submitFeedback(jobId, reaction, feedbackText)
      }),
    onSuccess: (data, variables) => {
      // Store feedback in local state
      setMessageFeedback(messageId, {
        reaction: variables.reaction,
        feedbackText: variables.feedbackText,
        feedbackId: data.id
      })
      
      ToastNotifications.success({
        title: data.message,
      })
    },
    onError: (error) => {
      console.error('Failed to submit feedback:', error)
      ToastNotifications.error({
        title: 'Failed to submit feedback',
        description: 'Please try again later',
      })
    },
    onSettled: () => {
      setIsSubmitting(false)
    }
  })

  // Delete feedback mutation
  const deleteFeedbackMutation = useMutation({
    mutationFn: (feedbackId: string) =>
      Sentry.startSpan({ name: 'Delete feedback' }, async () => {
        if (!jobId) throw new Error('Job ID is required for feedback deletion')
        return semanticSearchApi.deleteFeedback(jobId, feedbackId)
      }),
    onSuccess: (data) => {
      // Clear feedback from local state
      clearMessageFeedback(messageId)
      
      ToastNotifications.success({
        title: data.message,
      })
    },
    onError: (error) => {
      console.error('Failed to delete feedback:', error)
      ToastNotifications.error({
        title: 'Failed to remove feedback',
        description: 'Please try again later',
      })
    },
    onSettled: () => {
      setIsSubmitting(false)
    }
  })

  const handleLikeClick = () => {
    if (!jobId) {
      ToastNotifications.error({
        title: 'Unable to submit feedback',
        description: 'Job ID not available',
      })
      return
    }

    setIsSubmitting(true)

    // If already liked, remove the feedback
    if (currentFeedback?.reaction === 'like') {
      deleteFeedbackMutation.mutate(currentFeedback.feedbackId)
    } else {
      submitFeedbackMutation.mutate({ reaction: 'like' })
    }
  }

  const handleDislikeClick = () => {
    if (!jobId) {
      ToastNotifications.error({
        title: 'Unable to submit feedback',
        description: 'Job ID not available',
      })
      return
    }

    // If already disliked, remove the feedback
    if (currentFeedback?.reaction === 'dislike') {
      setIsSubmitting(true)
      deleteFeedbackMutation.mutate(currentFeedback.feedbackId)
    } else {
      // Open modal for dislike feedback
      onDislikeClick()
    }
  }

  const isLiked = currentFeedback?.reaction === 'like'
  const isDisliked = currentFeedback?.reaction === 'dislike'
  const isLoading = isSubmitting || submitFeedbackMutation.isPending || deleteFeedbackMutation.isPending

  return (
    <Flex gap={2}>
      {/* Like Button */}
      <Box
        as="button"
        p={1}
        borderRadius="md"
        bg="transparent"
        color={isLiked ? 'green.500' : 'gray.400'}
        cursor={isLoading ? 'not-allowed' : 'pointer'}
        opacity={isLoading ? 0.6 : 1}
        transition="all 0.2s"
        _hover={{
          color: isLiked ? 'green.600' : 'green.500',
          bg: 'gray.100'
        }}
        _active={{
          transform: isLoading ? 'none' : 'scale(0.95)',
        }}
        onClick={isLoading ? undefined : handleLikeClick}
        aria-label="Like this response"
      >
        {isLiked ? <FaThumbsUp size={20} /> : <FiThumbsUp size={20} />}
      </Box>

      {/* Dislike Button */}
      <Box
        as="button"
        p={2}
        borderRadius="md"
        bg="transparent"
        color={isDisliked ? 'red.500' : 'gray.400'}
        cursor={isLoading ? 'not-allowed' : 'pointer'}
        opacity={isLoading ? 0.6 : 1}
        transition="all 0.2s"
        _hover={{
          color: isDisliked ? 'red.600' : 'red.500',
          bg: 'gray.100'
        }}
        _active={{
          transform: isLoading ? 'none' : 'scale(0.95)',
        }}
        onClick={isLoading ? undefined : handleDislikeClick}
        aria-label="Dislike this response"
      >
        {isDisliked ? <FaThumbsDown size={20} /> : <FiThumbsDown size={20} />}
      </Box>
    </Flex>
  )
}

export { FeedbackButtons as default }
export type { FeedbackButtonsProps }
