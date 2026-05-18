import { FaFilePdf, FaEye } from 'react-icons/fa6'
import { Box, Button, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import type { CaseDocument } from '../types'
import { DownloadIcon } from '@/features/shared/icons/DownloadIcon'
import { fetchDocumentUrl } from '../api'
import { ToastNotifications } from '@/features/shared/components/ToastNotifications'
import { COLORS } from '@/features/shared/constants/StyleConstants'
import { useState } from 'react'

interface CaseDocumentsProps {
  documents: Array<CaseDocument>
}

const CaseDocuments = ({ documents }: CaseDocumentsProps) => {
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [viewingIds, setViewingIds] = useState<Set<string>>(new Set())

  const handleView = async (doc: CaseDocument) => {
    if (!doc.url) {
      ToastNotifications.error({
        title: 'View Failed',
        description: 'Document file path is not available',
      })
      return
    }

    setViewingIds(prev => new Set(prev).add(doc.id))

    try {
      const presignedUrl = await fetchDocumentUrl(doc.url, true)

      // Open document in new tab for viewing
      window.open(presignedUrl, '_blank', 'noopener,noreferrer')

      ToastNotifications.success({
        title: 'Document Opened',
        description: `Opening ${doc.name} in new tab`,
      })
    } catch (error) {
      console.error('View failed:', error)
      ToastNotifications.error({
        title: 'View Failed',
        description: 'Failed to view the document. Please try again.',
      })
    } finally {
      setViewingIds(prev => {
        const updated = new Set(prev)
        updated.delete(doc.id)
        return updated
      })
    }
  }

  const handleDownload = async (doc: CaseDocument) => {
    if (!doc.url) {
      ToastNotifications.error({
        title: 'Download Failed',
        description: 'Document file path is not available',
      })
      return
    }

    setDownloadingIds(prev => new Set(prev).add(doc.id))

    try {
      const presignedUrl = await fetchDocumentUrl(doc.url, false)

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a')
      link.href = presignedUrl
      link.download = doc.name
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      ToastNotifications.success({
        title: 'Download Started',
        description: `Downloading ${doc.name}`,
      })
    } catch (error) {
      console.error('Download failed:', error)
      ToastNotifications.error({
        title: 'Download Failed',
        description: 'Failed to download the document. Please try again.',
      })
    } finally {
      setDownloadingIds(prev => {
        const updated = new Set(prev)
        updated.delete(doc.id)
        return updated
      })
    }
  }

  const handleDownloadAll = async () => {
    const documentsToDownload = documents.filter(doc => doc.url)

    if (documentsToDownload.length === 0) {
      ToastNotifications.error({
        title: 'Download Failed',
        description: 'No documents available for download',
      })
      return
    }

    setDownloadingAll(true)

    try {
      for (const doc of documentsToDownload) {
        await handleDownload(doc)
        // Add a small delay between downloads to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } finally {
      setDownloadingAll(false)
    }
  }

  // If no data available, show placeholder
  if (documents.length === 0) {
    return (
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        shadow="sm"
        border="1px"
        borderColor={COLORS.neutral[200]}
      >
        <Heading size="sm" mb={4} color={COLORS.neutral[800]}>
          Case Documents
        </Heading>
        <Text color={COLORS.text.tertiary} textAlign="center">
          No data available
        </Text>
      </Box>
    )
  }

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      shadow="sm"
      border="1px"
      borderColor={COLORS.neutral[200]}
    >
      <Heading size="sm" mb={4} color={COLORS.neutral[800]}>
        Case Documents
      </Heading>
      <VStack gap={3} align="stretch">
        {documents.map((doc, index) => (
          <Flex
            key={index}
            justify="space-between"
            align="center"
            p={3}
            bg={COLORS.neutral[50]}
            borderRadius="md"
          >
            <Box>
              <Flex gap={2}>
                <Flex alignItems="center" color={COLORS.error[600]}>
                  <FaFilePdf />
                </Flex>
                <span>
                  <Text fontSize="sm" fontWeight="medium">
                    {doc.name}
                  </Text>
                  <Flex fontSize="xs" color={COLORS.text.tertiary} gap={2}>
                    <Text>{doc.size}</Text>
                    {doc.type && <Text>• {doc.type}</Text>}
                    {doc.uploadedBy && <Text>• By: {doc.uploadedBy}</Text>}
                  </Flex>
                </span>
              </Flex>
            </Box>
            <Flex gap={2}>
              <Button
                size="sm"
                variant="ghost"
                color={COLORS.primary[600]}
                onClick={() => handleView(doc)}
                loading={viewingIds.has(doc.id)}
                disabled={!doc.url}
              >
                <FaEye size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                color={COLORS.primary[600]}
                onClick={() => handleDownload(doc)}
                loading={downloadingIds.has(doc.id)}
                disabled={!doc.url}
              >
                <DownloadIcon size={16} />
              </Button>
            </Flex>
          </Flex>
        ))}
        <Button
          bg={COLORS.primary[600]}
          color="white"
          _hover={{ bg: 'blue.700' }}
          size="sm"
          mt={3}
          onClick={handleDownloadAll}
          loading={downloadingAll}
          disabled={documents.filter(doc => doc.url).length === 0}
        >
          <DownloadIcon size={16} style={{ marginRight: '8px' }} />
          Download All
        </Button>
      </VStack>
    </Box>
  )
}

export default CaseDocuments
