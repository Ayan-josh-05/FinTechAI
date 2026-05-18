import { Badge, HStack, VStack, Box, Text } from '@chakra-ui/react'
import { Streamdown } from 'streamdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import TableContent from './TableContent'
import type { TableData } from '@/utils/sseParser'
import { splitMarkdownAtEmptyArray } from '@/utils/markdownUtils'

interface SearchResultContentProps {
  data: {
    introduction: string
    elements: Array<{
      number: number
      title: string
      description: string
      tables?: Array<TableData>
    }>
  }
  fromHistory?: boolean
}

function unwrapMarkdownFencedBlocks(md: string): string {
  return md.replace(/```markdown\s*([\s\S]*?)```/g, (_, inner) => {
    const normalized = inner
      .split('\n')
      .map((line:any) => line.replace(/^\s{4,}/, ''))
      .join('\n')
      .trim();

    return normalized;
  });
}
function normalizeMarkdownSafe(md: string): string {
  if (!md) return "";
  md = unwrapMarkdownFencedBlocks(md);
  return md.trim();
}

const SearchResultContent = ({
  data,
  fromHistory = false,
}: SearchResultContentProps) => {
  const hasIntroduction = data.introduction && data.introduction.trim() !== ''

  // When fromHistory=true, all content is in introduction and elements is empty
  const isHistoryView = Boolean(
    fromHistory || (hasIntroduction && data.elements.length === 0),
  )

  // Shared markdown styling
  const markdownStyles = {
    fontFamily: 'inherit',
    '& *': {
      fontFamily: 'inherit',
    },
    '& h1': {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      marginBottom: '1rem',
      marginTop: '1.5rem',
      color: '#2D3748',
      fontFamily: 'inherit',
      lineHeight: '1.3',
    },
    '& h2': {
      fontSize: '1.25rem',
      fontWeight: 'bold',
      marginBottom: '0.75rem',
      marginTop: '1.25rem',
      color: '#2D3748',
      fontFamily: 'inherit',
      lineHeight: '1.4',
    },
    '& h3': {
      fontSize: '1.125rem',
      fontWeight: 'bold',
      marginBottom: '0.5rem',
      marginTop: '1rem',
      color: '#2D3748',
      fontFamily: 'inherit',
      lineHeight: '1.4',
    },
    '& h4': {
      fontSize: '1rem',
      fontWeight: 'bold',
      marginBottom: '0.5rem',
      marginTop: '0.75rem',
      color: '#2D3748',
      fontFamily: 'inherit',
    },
    '& h5': {
      fontSize: '0.95rem',
      fontWeight: 'bold',
      marginBottom: '0.4rem',
      marginTop: '0.75rem',
      color: '#2D3748',
      fontFamily: 'inherit',
      lineHeight: '1.4',
    },
    '& h6': {
      fontSize: '0.875rem',
      fontWeight: 'bold',
      marginBottom: '0.35rem',
      marginTop: '0.5rem',
      color: '#2D3748',
      fontFamily: 'inherit',
      lineHeight: '1.4',
    },
    '& ul, & ol': {
      paddingLeft: '1.5rem',
      marginBottom: '1rem',
      marginTop: '0.5rem',
    },
    '& li': {
      marginBottom: '0.5rem',
      lineHeight: '1.6',
    },
    '& p': {
      marginBottom: '1rem',
      fontFamily: 'inherit',
      lineHeight: '1.6',
    },
    '& strong': {
      fontWeight: 'bold',
      fontFamily: 'inherit',
    },
    '& em': {
      fontStyle: 'italic',
      fontFamily: 'inherit',
    },
    '& code': {
      backgroundColor: 'gray.100',
      padding: '0.125rem 0.375rem',
      borderRadius: '0.25rem',
      fontSize: '0.875em',
      fontFamily: 'monospace',
      color: 'gray.800',
    },
    '& pre': {
      backgroundColor: 'gray.100',
      padding: '1rem',
      borderRadius: '0.5rem',
      overflow: 'auto',
      marginBottom: '1rem',
      marginTop: '0.5rem',
      fontFamily: 'monospace',
      fontSize: '0.875rem',
      lineHeight: '1.5',
    },
    '& pre code': {
      backgroundColor: 'transparent',
      padding: 0,
    },
    '& blockquote': {
      borderLeft: '4px solid',
      borderColor: 'gray.300',
      paddingLeft: '1rem',
      marginLeft: 0,
      marginBottom: '1rem',
      marginTop: '0.5rem',
      color: 'gray.600',
      fontStyle: 'italic',
    },
    '& a': {
      color: 'blue.500',
      textDecoration: 'underline',
      '&:hover': {
        color: 'blue.600',
      },
    },
    '& hr': {
      border: 'none',
      borderTop: '1px solid',
      borderColor: 'gray.300',
      margin: '1.5rem 0',
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '1rem',
      marginTop: '0.5rem',
    },
    '& th, & td': {
      border: '1px solid',
      borderColor: 'gray.300',
      padding: '0.5rem',
      textAlign: 'left',
    },
    '& th': {
      backgroundColor: 'gray.50',
      fontWeight: 'bold',
    },
  }

  const renderContentWithMarkdownBreak = (
    content: string,
    fontSize: string = 'md',
    color: string = 'gray.700',
    usePureMarkdown: boolean = false,
  ) => {
    if (!content || !content.trim()) return null

    if (usePureMarkdown) {
      return (
        <Box
          fontSize={fontSize}
          color={color}
          lineHeight="1.6"
          wordBreak="break-word"
          overflowWrap="break-word"
          maxW="100%"
          css={markdownStyles}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              table: ({ node, ...props }) => <Box as="table" width="100%" {...props} />,
              thead: ({ node, ...props }) => <Box as="thead" {...props} />,
              tbody: ({ node, ...props }) => <Box as="tbody" {...props} />,
              tr: ({ node, ...props }) => <Box as="tr" {...props} />,
              th: ({ node, ...props }) => <Box as="th" {...props} />,
              td: ({ node, ...props }) => <Box as="td" {...props} />,
              ul: ({ node, ...props }) => {
                const { children, ...restProps } = props as any
                return (
                  <Box as="ul" pl="1.5rem" {...restProps}>
                    {children}
                  </Box>
                )
              },
              ol: ({ node, ...props }) => {
                const { children, ...restProps } = props as any
                return (
                  <Box as="ol" pl="1.5rem" {...restProps}>
                    {children}
                  </Box>
                )
              },
              li: ({ node, ...props }) => {
                const { children, ...restProps } = props as any
                return (
                  <Box as="li" mb="0.5rem" {...restProps}>
                    {children}
                  </Box>
                )
              },
              pre: ({ node, ...props }) => {
                const { children, ...restProps } = props as any
                return (
                  <Box as="pre" whiteSpace="pre" {...restProps}>
                    {children}
                  </Box>
                )
              },
            }}
          >
            {normalizeMarkdownSafe(content)}
          </ReactMarkdown>
        </Box>
      )
    }

    const segments = splitMarkdownAtEmptyArray(content)
    if (segments.length === 0) return null

    return (
      <Box
        fontSize={fontSize}
        color={color}
        lineHeight="1.6"
        wordBreak="break-word"
        overflowWrap="break-word"
        maxW="100%"
        css={markdownStyles}
      >
        {segments.map((segment, index) =>
          segment.isMarkdown ? (
            <Streamdown key={index} controls={false}>
              {segment.content}
            </Streamdown>
          ) : (
            <Text key={index} as="span" whiteSpace="pre-wrap">
              {segment.content}
            </Text>
          ),
        )}
      </Box>
    )
  }

  return (
    <VStack align="stretch" gap={6}>
      {/* Introduction - Render as Markdown */}
      {hasIntroduction &&
        renderContentWithMarkdownBreak(
          data.introduction,
          'md',
          'gray.700',
          isHistoryView,
        )}

      {/* Elements List - Only show if not history view */}
      {!isHistoryView && (
        <VStack align="stretch" gap={4}>
          {data.elements.map((element) => (
            <HStack
              key={element.number}
              align="start"
              gap={4}
              w="100%"
              maxW="100%"
            >
              {/* Number Badge */}
              <Badge
                bg="blue.100"
                color="blue.600"
                borderRadius="full"
                w="32px"
                h="32px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="sm"
                fontWeight="bold"
                flexShrink={0}
              >
                {element.number}
              </Badge>

              {/* Content */}
              <VStack align="stretch" gap={2} flex={1} minW={0}>
                {(() => {
                  const titleSegments = splitMarkdownAtEmptyArray(element.title)
                  return (
                    <Box
                      fontSize="md"
                      fontWeight="bold"
                      color="gray.800"
                      wordBreak="break-word"
                      overflowWrap="break-word"
                      maxW="100%"
                      css={{
                        ...markdownStyles,
                        '& h1, & h2, & h3, & h4': {
                          fontWeight: 'bold',
                          color: '#2D3748',
                          marginBottom: '0.5rem',
                          marginTop: '0.5rem',
                          fontSize: 'inherit',
                        },
                        '& p': {
                          marginBottom: '0.5rem',
                          fontWeight: 'bold',
                        },
                        '& strong': {
                          fontWeight: 'bold',
                        },
                      }}
                    >
                      {titleSegments.map((segment, index) =>
                        segment.isMarkdown ? (
                          <Streamdown key={index} controls={false}>
                            {segment.content}
                          </Streamdown>
                        ) : (
                          <Text
                            key={index}
                            as="span"
                            whiteSpace="pre-wrap"
                            fontWeight="bold"
                          >
                            {segment.content}
                          </Text>
                        ),
                      )}
                    </Box>
                  )
                })()}
                {renderContentWithMarkdownBreak(
                  element.description,
                  'sm',
                  'gray.700',
                )}

                {/* Render any tables associated with this element */}
                {element.tables?.map((table, tableIndex) => (
                  <TableContent key={tableIndex} data={table} />
                ))}
              </VStack>
            </HStack>
          ))}
        </VStack>
      )}
    </VStack>
  )
}

export default SearchResultContent
