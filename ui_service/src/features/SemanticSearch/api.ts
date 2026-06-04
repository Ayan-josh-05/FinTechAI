import Cookies from 'js-cookie'
import api from '@/integrations/axiosInterceptor'
import { API_BASE_URL } from '@/constants'

export interface SemanticSearchRequest {
  query: string
  filters?: {
    dateFrom?: string
    dateTo?: string
    legalAct?: string
    riskScore?: string
    verificationStatus?: string
  }
  limit?: number
  offset?: number
}

export interface SemanticSearchResult {
  id: string
  title: string
  content: string
  relevanceScore: number
  documentType: string
  date: string
  source: string
  metadata?: Record<string, any>
}

export interface SemanticSearchResponse {
  results: Array<SemanticSearchResult>
  totalCount: number
  query: string
  searchTime: number
  suggestions?: Array<string>
}

export interface SemanticSearchResultById {
  id: string
  query: string
  answer: {
    introduction: string
    elements: Array<{
      number: number
      title: string
      description: string
    }>
  }
  citations: Array<{
    title: string
    url: string
    [key: string]: unknown
  }>
  searchedAt: string
  sourcesCount: number
  jobId?: string
  sources?: Array<SearchSource>
}

export interface HistorySearchResponse {
  id: string
  query: string
  output: string
  sources: Array<{
    case_id?: string
    case_no?: string
    case_title?: string
    case_type?: string
    court?: string
  }>
}

export interface SearchSource {
  case_id?: string
  case_no?: string
  case_type?: string
  court?: string
  title?: string
}

export interface SearchSourcesResponse {
  sources: Array<SearchSource>
  count: number
}

export interface SearchHistoryItem {
  id: string
  title: string
}

export interface SearchHistoryResponse {
  results: Array<SearchHistoryItem>
  page: number
  page_size: number
  total: number
}

export interface ChatHistoryMessage {
  id: string  // messageId
  query: string
  output: string | null
  sources: Array<{
    case_id?: string
    case_no?: string
    case_title?: string
    case_type?: string
    court?: string
  }>
}

export interface ChatHistoryResponse {
  results: Array<ChatHistoryMessage>
  page: number
  page_size: number
}

const normalizeMarkdown = (text: string): string => {
  if (!text) return text;

  let normalized = text;

  // 1. Normalize headers: ensure space after # characters
  // Converts ##1. to ## 1., ###Title to ### Title, etc.
  normalized = normalized.replace(/^(#{1,3})([^\s#\n\r])/gm, '$1 $2');

  // 2. Normalize bullet points: ensure proper list formatting
  // Convert various bullet styles to standard markdown bullets
  // Handle cases like: "• item" or "- item" or "* item" (already correct)
  // Ensure bullets are at start of line or after whitespace
  normalized = normalized.replace(/^(\s*)[•·]\s+/gm, '$1- ');

  // 3. Normalize numbered lists: ensure proper spacing
  // Convert "1.item" to "1. item" (add space after number)
  normalized = normalized.replace(/^(\s*)(\d+)\.([^\s])/gm, '$1$2. $3');

  // 4. Normalize italic: ensure proper formatting
  // Convert _text_ or *text* (ensure they're not part of bold or code)
  // This is more complex, so we'll be conservative and only fix obvious issues
  // Don't change existing italic syntax as it's usually correct

  // 5. Normalize bold: ensure proper formatting
  // Convert **text** or __text__ (ensure proper pairing)
  // Don't change existing bold syntax as it's usually correct

  // 6. Normalize inline code: ensure backticks are properly paired
  // This is complex, so we'll leave it as-is unless there are obvious issues

  // 7. Ensure proper line breaks for lists
  // Add blank line before lists if missing (helps with markdown parsing)
  normalized = normalized.replace(/([^\n])\n([-*+]\s)/g, '$1\n\n$2');
  normalized = normalized.replace(/([^\n])\n(\d+\.\s)/g, '$1\n\n$2');

  // 8. Normalize blockquotes: ensure proper formatting
  // Convert ">text" to "> text" (add space after >)
  normalized = normalized.replace(/^(\s*)>([^\s])/gm, '$1> $2');

  // 9. Normalize horizontal rules: ensure proper formatting
  // Convert "---" or "***" to "---" (standardize)
  // This is usually fine as-is

  // 10. Ensure proper spacing around emphasis markers
  // Fix cases like "*text*" where there might be issues with word boundaries
  // Be careful not to break existing valid markdown

  return normalized;
};

// Keep the old function name for backward compatibility, but use the new comprehensive function
const normalizeMarkdownHeaders = (text: string): string => {
  return normalizeMarkdown(text);
};

// Helper function to extract ALL markdown content from events
// Markdown content starts with #, ##, ### and ends with []
// This works incrementally during streaming and handles markdown split across events
// Extracts multiple markdown blocks if present
const extractMarkdownContent = (events: Array<string>): { markdown: string; remainingEvents: Array<string>; inMarkdown: boolean } => {
  // First, join all events to check for markdown pattern
  const joinedContent = events.join('');

  // Find ALL markdown blocks (starts with #, ##, ### and ends with [])
  const markdownBlocks: Array<{ start: number; end: number }> = [];
  let searchStart = 0;

  while (true) {
    // Match headers with or without space after # (e.g., ##1. or ## 1.)
    const markdownStartMatch = joinedContent.substring(searchStart).match(/(^|\n)(#{1,3}\s*[^\n#]*)/);

    if (!markdownStartMatch || markdownStartMatch.index === undefined) {
      break; // No more markdown blocks found
    }

    // markdownStartMatch[1] is always defined because regex (^|\n) always matches
    const prefixLength = markdownStartMatch[1].length;
    const relativeStartIndex = markdownStartMatch.index + prefixLength;
    const absoluteStartIndex = searchStart + relativeStartIndex;
    const endMarkerIndex = joinedContent.indexOf('[]', absoluteStartIndex);

    if (endMarkerIndex === -1) {
      // Markdown start found but no end marker yet (streaming in progress)
      // Return partial markdown from the first incomplete block
      let partialMarkdown = joinedContent.substring(absoluteStartIndex);
      partialMarkdown = normalizeMarkdownHeaders(partialMarkdown);

      // Find which event contains the start
      let eventStartIndex = 0;
      let charCount = 0;
      for (let i = 0; i < events.length; i++) {
        if (charCount + events[i].length > absoluteStartIndex) {
          eventStartIndex = i;
          break;
        }
        charCount += events[i].length;
      }
      const remainingEvents = events.slice(0, eventStartIndex);
      return { markdown: partialMarkdown, remainingEvents, inMarkdown: true };
    }

    // Found a complete markdown block
    markdownBlocks.push({ start: absoluteStartIndex, end: endMarkerIndex });
    searchStart = endMarkerIndex + 2; // Continue searching after this block
  }

  if (markdownBlocks.length === 0) {
    // No markdown found
    return { markdown: '', remainingEvents: events, inMarkdown: false };
  }

  // Extract all markdown blocks and combine them
  const markdownParts: Array<string> = [];
  const removedRanges: Array<{ start: number; end: number }> = [];

  for (const block of markdownBlocks) {
    let blockContent = joinedContent.substring(block.start, block.end);
    // Remove the [] ending marker but preserve all other content including newlines
    blockContent = blockContent.replace(/\[\s*$/, '').trim();
    // Normalize markdown headers
    blockContent = normalizeMarkdownHeaders(blockContent);
    if (blockContent) {
      markdownParts.push(blockContent);
      removedRanges.push({ start: block.start, end: block.end + 2 }); // Include the []
    }
  }

  // Join markdown parts with spacing based on [][] pattern
  // If there's [][] between markdown blocks, add 2 newlines
  let combinedMarkdown = '';
  for (let i = 0; i < markdownParts.length; i++) {
    if (i > 0) {
      // Always use 2 newlines between markdown blocks when [][] pattern is detected
      // This ensures proper spacing before sections 2 and 3
      combinedMarkdown += '\n\n';
    }
    combinedMarkdown += markdownParts[i];
  }

  // Remove all markdown blocks from the joined content
  // Build remaining content by removing all markdown ranges
  let remainingContent = joinedContent;
  // Remove from end to start to preserve indices
  const sortedRanges = [...removedRanges].sort((a, b) => b.start - a.start);

  for (const range of sortedRanges) {
    remainingContent =
      remainingContent.substring(0, range.start) +
      remainingContent.substring(range.end);
  }

  // Also replace [][] pattern in remaining content with 2 newlines
  // Handle cases where [] and [] might be separated by whitespace or newlines
  remainingContent = remainingContent.replace(/\[\]\s*\[\]/g, '\n\n');
  remainingContent = remainingContent.replace(/\[\]\s*\n\s*\[\]/g, '\n\n');

  // For remaining events, we'll approximate by keeping the structure
  // Since we've removed markdown, we can return the remaining content as a single string
  // The joinEvents function will handle it properly
  const remainingEvents = remainingContent ? [remainingContent] : [];

  return { markdown: combinedMarkdown, remainingEvents, inMarkdown: false };
};

// Helper function to format section headers in bold
// Only formats the three specific headers: "1. Cases Involved", "2. Answer Summary", "3. Other Information of the Case(s)"
// Handles headers with or without ## prefix (markdown headers)
export const formatSectionHeaders = (content: string): string => {
  // Only match the three specific section headers
  const specificHeaders = [
    '1. Cases Involved',
    '2. Answer Summary',
    '3. Other Information of the Case(s)',
  ];

  let formattedContent = content;

  // Format each specific header in bold
  for (const header of specificHeaders) {
    const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match header with ## prefix (markdown header) - replace ## with **
    // Allow optional space before ##, and content after the header (including [] marker)
    // Ensure header starts on a new line after \n\n (from [][] replacement)
    const markdownHeaderPattern = new RegExp(`(\\n\\n|^|\\n)\\s*##\\s*(${escapedHeader})(?=\\s|\\n|\\[\\]|$|[A-Z])`, 'g');
    formattedContent = formattedContent.replace(markdownHeaderPattern, (_match, prefix, headerText) => {
      // Ensure header is on a new line - if we have \n\n, keep it; if just \n, ensure we have \n\n
      if (prefix === '\n\n') {
        return `${prefix}**${headerText}**`;
      } else if (prefix === '\n') {
        // If we have single \n, check if previous content ends with period - if so, add another \n
        return `\n\n**${headerText}**`;
      }
      return `${prefix}**${headerText}**`;
    });

    // Also handle case where header appears after content ending with period and \n\n
    // Pattern: .\n\n##header should become .\n\n**header** on new line
    const headerAfterPeriodPattern = new RegExp(`([.!?])\\s*\\n\\n\\s*##\\s*(${escapedHeader})(?=\\s|\\n|\\[\\]|$|[A-Z])`, 'g');
    formattedContent = formattedContent.replace(headerAfterPeriodPattern, (_match, punct, headerText) => {
      return `${punct}\n\n**${headerText}**`;
    });

    // Handle markdown headers that end with [] (markdown block end marker)
    // Pattern: ##header[] should become **header**
    formattedContent = formattedContent.replace(new RegExp(`##\\s*(${escapedHeader})\\[\\]`, 'g'), '**$1**');

    // Match header without ## prefix - wrap in **
    // Allow content after the header (space, newline, end, or capital letter indicating new sentence)
    const regularHeaderPattern = new RegExp(`(^|\\n)(${escapedHeader})(?=\\s|\\n|$|[A-Z])`, 'g');
    formattedContent = formattedContent.replace(regularHeaderPattern, (_match, prefix, headerText) => {
      // Only format if not already formatted
      if (!headerText.startsWith('**') || !headerText.endsWith('**')) {
        return `${prefix}**${headerText}**`;
      }
      return `${prefix}${headerText}`;
    });
  }

  return formattedContent;
};

// Helper function to join events - concatenates events as-is without adding spaces or newlines
// Adds newlines when 4 consecutive empty values are detected
// Also handles markdown content extraction
// Returns both regular content and markdown separately
export const joinEvents = (events: Array<string>): { content: string; markdown: string } => {
  // First, extract any markdown content
  const { markdown, remainingEvents } = extractMarkdownContent(events);

  // Process remaining events
  // If remainingEvents is a single string (from extractMarkdownContent), use it directly
  // Otherwise, join the events
  let regularContent = '';
  if (remainingEvents.length === 1 && typeof remainingEvents[0] === 'string') {
    // Already processed by extractMarkdownContent, use as-is
    regularContent = remainingEvents[0];
  } else {
    // Process events normally - join them first to create the [][] pattern
    regularContent = remainingEvents.join('');
  }

  // Replace [][] pattern with 2 newlines (two consecutive empty brackets)
  // This creates proper spacing before sections 2 and 3
  // CRITICAL: This must happen to create proper spacing before sections 2 and 3
  regularContent = regularContent.replace(/\[\]\[\]/g, '\n\n'); // Exact match: [][]
  regularContent = regularContent.replace(/\[\]\s+\[\]/g, '\n\n'); // With whitespace: [] []
  regularContent = regularContent.replace(/\[\]\s*\n\s*\[\]/g, '\n\n'); // With newline: []\n[]

  // Remove single [] markers (they're just delimiters, not content)
  regularContent = regularContent.replace(/\[\]/g, '');

  // Format section headers in bold (e.g., "1. Cases Involved", "2. Answer Summary", etc.)
  regularContent = formatSectionHeaders(regularContent);

  // Ensure headers are on new lines after \n\n (from [][] replacement)
  // Pattern: content ending with period, then \n\n, then header should be on next line
  // Also handle cases where header might be inline: replace period + \n\n + header with period + \n\n + newline + header
  regularContent = regularContent.replace(/([.!?])\s*\n\n\s*(\*\*\d+\.\s+[^*]+\*\*)/g, '$1\n\n$2');

  // Also format headers in markdown content
  let formattedMarkdown = markdown || '';
  if (formattedMarkdown) {
    formattedMarkdown = formatSectionHeaders(formattedMarkdown);
  }

  return { content: regularContent, markdown: formattedMarkdown };
};

// Helper SSE parser for simple "data: ..." event chunks
// Now handles JSON format with mode and message fields
const parseSSEChunk = (buffer: string): { 
  events: Array<string>; 
  thinkingMessages: Array<string>;
  responseMessages: Array<string>;
  errorMessages: Array<string>;
  metadataMessages: Array<Record<string, any>>;
  remainder: string;
  currentMode: 'thinking' | 'response' | 'error' | 'metadata' | null;
  jobId: string | null;
} => {
  const events: Array<string> = []
  const thinkingMessages: Array<string> = []
  const responseMessages: Array<string> = []
  const errorMessages: Array<string> = []
  const metadataMessages: Array<Record<string, any>> = []
  let currentMode: 'thinking' | 'response' | 'error' | 'metadata' | null = null
  let jobId: string | null = null
  let start = 0
  let idx: number

  while ((idx = buffer.indexOf('\n\n', start)) !== -1) {
    const chunk = buffer.slice(start, idx).trim()
    if (chunk) {
      const lines = chunk.split(/\r?\n/)
      let data = ''
      for (const line of lines) {
        if (line.startsWith('data:')) {
          data += line.slice(6).trim()
        }
      }
      if (data) {
        // Remove [DONE] marker (case-insensitive) - it's just to signal end of stream
        const cleanedData = data.replace(/\[DONE\]/gi, '').trim();

        if (cleanedData) {
          // Try to parse as JSON with mode and message
          try {
            const parsed = JSON.parse(cleanedData)
            if (parsed.mode && parsed.message) {
              currentMode = parsed.mode
              
              // Extract job_id from every chunk (new format)
              if (parsed.job_id && !jobId) {
                jobId = parsed.job_id
              }
              
              if (parsed.mode === 'thinking') {
                thinkingMessages.push(parsed.message)
              } else if (parsed.mode === 'response') {
                responseMessages.push(parsed.message)
              } else if (parsed.mode === 'error') {
                errorMessages.push(parsed.message)
              } else if (parsed.mode === 'metadata') {
                // Parse the message field which contains JSON metadata
                try {
                  const metadata = JSON.parse(parsed.message)
                  metadataMessages.push(metadata)
                } catch {
                  // If message is not valid JSON, store as-is
                  metadataMessages.push({ raw: parsed.message })
                }
              }
            } else {
              // Fallback to old format
              events.push(cleanedData)
            }
          } catch {
            // Not JSON, use old format
            events.push(cleanedData)
          }
        }
      }
    }
    start = idx + 2
  }

  const remainder = buffer.slice(start)

  return { events, thinkingMessages, responseMessages, errorMessages, metadataMessages, remainder, currentMode, jobId }
}

const createFallbackResult = (id: string, payload: string): SemanticSearchResultById => ({
  id,
  query: '',
  answer: {
    introduction: payload,
    elements: [],
  },
  citations: [],
  searchedAt: new Date().toISOString(),
  sourcesCount: 0,
})

const parseSemanticSearchStream = (payload: string, id: string): SemanticSearchResultById => {
  const cleanPayload = payload.trim()

  if (!cleanPayload) {
    throw new Error('Failed to parse semantic search result stream')
  }

  // Extract ALL markdown content from the payload
  // Look for all markdown blocks: starts with #, ##, ### and ends with []
  let markdown = '';
  let payloadForParsing = cleanPayload;

  // Find all markdown blocks
  const markdownBlocks: Array<{ start: number; end: number }> = [];
  let searchStart = 0;

  while (true) {
    // Match headers with or without space after # (e.g., ##1. or ## 1.)
    const markdownStartPattern = /(^|\n)(#{1,3}\s*[^\n#]*)/;
    const remainingContent = cleanPayload.substring(searchStart);
    const markdownMatch = remainingContent.match(markdownStartPattern);

    if (!markdownMatch || markdownMatch.index === undefined) {
      break; // No more markdown blocks found
    }

    // markdownMatch[1] is always defined because regex (^|\n) always matches
    const prefixLength = markdownMatch[1].length;
    const relativeStartIndex = markdownMatch.index + prefixLength;
    const absoluteStartIndex = searchStart + relativeStartIndex;
    const endMarkerIndex = cleanPayload.indexOf('[]', absoluteStartIndex);

    if (endMarkerIndex === -1) {
      break; // Incomplete markdown block, skip it
    }

    // Found a complete markdown block
    markdownBlocks.push({ start: absoluteStartIndex, end: endMarkerIndex });
    searchStart = endMarkerIndex + 2; // Continue searching after this block
  }

  // Extract and combine all markdown blocks
  if (markdownBlocks.length > 0) {
    const markdownParts: Array<string> = [];
    const removedRanges: Array<{ start: number; end: number }> = [];

    for (const block of markdownBlocks) {
      let blockContent = cleanPayload.substring(block.start, block.end);
      // Remove the [] ending marker but preserve all other content including newlines
      blockContent = blockContent.replace(/\[\s*$/, '').trim();
      // Normalize markdown headers
      blockContent = normalizeMarkdownHeaders(blockContent);
      if (blockContent) {
        markdownParts.push(blockContent);
        removedRanges.push({ start: block.start, end: block.end + 2 }); // Include the []
      }
    }

    markdown = markdownParts.join('\n\n');

    // Remove all markdown blocks from payload for JSON parsing
    // Remove from end to start to preserve indices
    const sortedRanges = [...removedRanges].sort((a, b) => b.start - a.start);
    for (const range of sortedRanges) {
      payloadForParsing =
        payloadForParsing.substring(0, range.start) +
        payloadForParsing.substring(range.end);
    }
    payloadForParsing = payloadForParsing.trim();
  }

  const tryParse = (input: string): SemanticSearchResultById | null => {
    const candidate = input.trim()
    if (!candidate || (candidate[0] !== '{' && candidate[0] !== '[')) {
      return null
    }

    try {
      return JSON.parse(candidate) as SemanticSearchResultById
    } catch {
      return null
    }
  }

  const wholePayloadResult = tryParse(payloadForParsing)
  if (wholePayloadResult) {
    // If we have markdown, append it to the introduction
    if (markdown) {
      wholePayloadResult.answer.introduction = wholePayloadResult.answer.introduction
        ? `${wholePayloadResult.answer.introduction}\n\n${markdown}`
        : markdown;
    }
    // Normalize markdown headers in introduction and elements
    wholePayloadResult.answer.introduction = normalizeMarkdownHeaders(wholePayloadResult.answer.introduction);
    wholePayloadResult.answer.elements = wholePayloadResult.answer.elements.map(el => ({
      ...el,
      title: normalizeMarkdownHeaders(el.title),
      description: normalizeMarkdownHeaders(el.description),
    }));
    return wholePayloadResult
  }

  const firstBrace = payloadForParsing.indexOf('{')
  const lastBrace = payloadForParsing.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const sliceResult = tryParse(payloadForParsing.slice(firstBrace, lastBrace + 1))
    if (sliceResult) {
      // If we have markdown, append it to the introduction
      if (markdown) {
        sliceResult.answer.introduction = sliceResult.answer.introduction
          ? `${sliceResult.answer.introduction}\n\n${markdown}`
          : markdown;
      }
      // Normalize markdown headers in introduction and elements
      sliceResult.answer.introduction = normalizeMarkdownHeaders(sliceResult.answer.introduction);
      sliceResult.answer.elements = sliceResult.answer.elements.map(el => ({
        ...el,
        title: normalizeMarkdownHeaders(el.title),
        description: normalizeMarkdownHeaders(el.description),
      }));
      return sliceResult
    }
  }

  const candidates = payloadForParsing
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line.toLowerCase() !== '[done]')

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const parsed = tryParse(candidates[index])
    if (parsed) {
      // If we have markdown, append it to the introduction
      if (markdown) {
        parsed.answer.introduction = parsed.answer.introduction
          ? `${parsed.answer.introduction}\n\n${markdown}`
          : markdown;
      }
      // Normalize markdown headers in introduction and elements
      parsed.answer.introduction = normalizeMarkdownHeaders(parsed.answer.introduction);
      parsed.answer.elements = parsed.answer.elements.map(el => ({
        ...el,
        title: normalizeMarkdownHeaders(el.title),
        description: normalizeMarkdownHeaders(el.description),
      }));
      return parsed
    }
  }

  // Fallback: include both regular content and markdown
  const fallbackContent = payloadForParsing || cleanPayload;
  let finalContent = markdown
    ? (fallbackContent ? `${fallbackContent}\n\n${markdown}` : markdown)
    : fallbackContent;

  // Normalize markdown headers in fallback content
  finalContent = normalizeMarkdownHeaders(finalContent);

  return createFallbackResult(id, finalContent)
}

export const semanticSearchApi = {
  /**
   * Fetches semantic search result by job ID using Server-Sent Events (SSE).
   * 
   * Browser vs Postman difference:
   * - Postman doesn't buffer responses, streams work immediately
   * - Browsers buffer responses without Transfer-Encoding: chunked
   * - Browser's fetch API waits for first chunk before making stream available
   * 
   * Solution: Server must send Transfer-Encoding: chunked header
   * or send first chunk immediately to prevent browser buffering.
   * 
   * @param onUpdate - Optional callback to receive incremental updates as data streams in
   * @param onThinkingUpdate - Optional callback to receive thinking messages
   * @param onModeChange - Optional callback when mode changes from thinking to response
   * @param abortController - Optional AbortController to control request cancellation
   */
  getSearchResultById: async (
    id: string,
    onUpdate?: (partialResult: Partial<SemanticSearchResultById>) => void,
    onThinkingUpdate?: (message: string) => void,
    onModeChange?: (mode: 'thinking' | 'response' | 'error') => void,
    onErrorUpdate?: (message: string) => void,
    onJobId?: (jobId: string) => void,
    abortController?: AbortController
  ): Promise<SemanticSearchResultById> => {
    const accessToken = Cookies.get('access_token');
    const url = `${API_BASE_URL}/search/job/${id}`;

    const headers: HeadersInit = {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const controller = abortController || new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store',
        signal: controller.signal,
      });

      // Basic HTTP checks
      if (!response.ok) {
        const errorText =
          await response.text().catch(() => 'Unable to read error response');
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      reader = response.body.getReader();

      const decoder = new TextDecoder();
      let buffer = '';
      const allEvents: Array<string> = [];
      const allResponseMessages: Array<string> = [];
      const allMetadata: Array<Record<string, any>> = [];
      let currentMode: 'thinking' | 'response' | 'error' | 'metadata' | null = null;
      let hasNotifiedModeChange = false;
      let extractedJobId: string | undefined = undefined;

      // Unified streaming loop (no separate first read to avoid blocking issues)
      let chunkCount = 0;
      let done = false;
      let consecutiveEmptyCount = 0;
      let lastWasEmpty = false; // Track if last event was empty for [][] detection

      while (!done) {
        chunkCount++;
        const { done: rDone, value } = await reader.read();
        done = rDone;

        if (value && value.length) {
          buffer += decoder.decode(value, { stream: true });
          const { events, thinkingMessages, responseMessages, errorMessages, metadataMessages, remainder, currentMode: newMode, jobId } = parseSSEChunk(buffer);
          
          // Call onJobId callback as soon as job_id is extracted
          if (jobId && !extractedJobId && onJobId) {
            extractedJobId = jobId;
            onJobId(jobId);
          }
          
          // Handle metadata messages
          if (metadataMessages.length > 0) {
            allMetadata.push(...metadataMessages);
          }
          
          // Handle thinking messages
          if (thinkingMessages.length > 0 && onThinkingUpdate) {
            thinkingMessages.forEach(msg => onThinkingUpdate(msg));
          }
          
          // Handle error messages
          if (errorMessages.length > 0) {
            if (onErrorUpdate) {
              errorMessages.forEach(msg => onErrorUpdate(msg));
            }
            if (onModeChange && currentMode !== 'error') {
              onModeChange('error');
            }
          }
          
          // Handle mode change from thinking to response or error
          if (newMode && newMode !== currentMode) {
            currentMode = newMode;
            if ((currentMode === 'response' || currentMode === 'error') && !hasNotifiedModeChange && onModeChange) {
              onModeChange(currentMode);
              hasNotifiedModeChange = true;
            }
          }
          
          // Handle response messages - accumulate them
          if (responseMessages.length > 0) {
            allResponseMessages.push(...responseMessages);
            // IMPORTANT: Also add to allEvents so final payload isn't empty
            allEvents.push(...responseMessages);
            
            // Call onUpdate with buffered response content
            if (onUpdate) {
              try {
                const bufferedContent = allResponseMessages.join('');
                const partialResult: Partial<SemanticSearchResultById> = {
                  id,
                  answer: {
                    introduction: bufferedContent,
                    elements: [],
                  },
                };
                onUpdate(partialResult);
              } catch (error) {
                // Ignore parsing errors for partial data
              }
            }
          }

          // Track consecutive empty events (for old format compatibility)
          if (events.length === 0 && thinkingMessages.length === 0 && responseMessages.length === 0 && errorMessages.length === 0) {
            // Check if we're in an unclosed markdown block
            // Look at all events to see if there's a markdown start without a corresponding end
            const allContent = allEvents.join('');
            const markdownStartPattern = /(^|\n)(#{1,3}\s*[^\n#]*)/g;
            const matches = Array.from(allContent.matchAll(markdownStartPattern));
            let hasUnclosedMarkdown = false;

            if (matches.length > 0) {
              // Get the last markdown start position
              const lastMatch = matches[matches.length - 1];
              const lastMatchIndex = lastMatch.index + lastMatch[0].length;
              const contentAfterLastMarkdown = allContent.substring(lastMatchIndex);
              // Check if there's a [] marker after the last markdown start
              const hasClosingMarker = contentAfterLastMarkdown.includes('[]');
              hasUnclosedMarkdown = !hasClosingMarker;
            }

            // If we have an unclosed markdown block, this empty array likely closes it
            if (hasUnclosedMarkdown) {
              // This empty array marks the end of the markdown block
              allEvents.push('[]');
              consecutiveEmptyCount = 0;
              lastWasEmpty = true;
            } else {
              // Check for [][] pattern (two consecutive empty arrays)
              if (lastWasEmpty) {
                // This is the second consecutive empty array, add 2 newlines
                // This creates proper spacing before sections 2 and 3
                allEvents.push('\n\n');
                lastWasEmpty = false;
                consecutiveEmptyCount = 0;
              } else {
                consecutiveEmptyCount++;
                if (consecutiveEmptyCount === 2) {
                  // Push '\n\n' for 2 consecutive empty events (legacy behavior)
                  allEvents.push('\n\n');
                  consecutiveEmptyCount = 0;
                }
                lastWasEmpty = true;
                // Don't push anything for the first empty event
              }
            }
          } else {
            consecutiveEmptyCount = 0;
            lastWasEmpty = false;
            allEvents.push(...events);
          }

          // Call onUpdate with partial result as data arrives
          if (onUpdate && events.length > 0) {
            try {
              const { content, markdown } = joinEvents(allEvents);
              const partialPayload = markdown ? `${content}\n\n${markdown}` : content;
              const partialResult = parseSemanticSearchStream(partialPayload, id);
              onUpdate(partialResult);
            } catch (error) {
              // Ignore parsing errors for partial data - it will be retried on next chunk
            }
          }

          buffer = remainder;
        } else if (!done && !value) {
          // rare condition: no value but not done — continue loop and avoid tight spin
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }

      // Final decode flush
      const finalChunk = decoder.decode();
      if (finalChunk) {
        buffer += finalChunk;
      }

      if (buffer.trim()) {
        const { events, remainder } = parseSSEChunk(buffer + '\n\n');
        if (events.length === 0) {
          allEvents.push('\n');
        } else {
          allEvents.push(...events);
        }
        if (remainder.trim()) {
          allEvents.push(remainder.trim());
        }
      }

      // Extract sources from metadata
      let extractedSources: SearchSource[] = []
      if (allMetadata.length > 0) {
        for (const metadata of allMetadata) {
          if (metadata.sources && Array.isArray(metadata.sources)) {
            extractedSources = metadata.sources
            break // Take the first sources array found
          }
        }
      }

      // If we have response messages from the new format, use them directly
      if (allResponseMessages.length > 0) {
        const bufferedContent = allResponseMessages.join('');
        return {
          id,
          query: '',
          answer: {
            introduction: bufferedContent,
            elements: [],
          },
          citations: [],
          searchedAt: new Date().toISOString(),
          sourcesCount: extractedSources.length,
          sources: extractedSources,
        };
      }

      // Otherwise, use the old format parsing
      const { content, markdown } = joinEvents(allEvents);
      const payloadString = markdown ? `${content}\n\n${markdown}` : content;
      const trimmedPayload = payloadString.trimEnd();
      if (trimmedPayload.trim().length === 0) {
        throw new Error(
          'No data received from SSE stream. Browser buffering detected or server sent empty stream.'
        );
      }

      return parseSemanticSearchStream(trimmedPayload, id);
    } finally {
      // Cleanup: release locks and abort if still running
      try {
        if (reader) {
          await reader.cancel().catch(() => { });
          reader.releaseLock();
        }
      } catch (e) {
        // ignoring cleanup errors
      }
      try {
        // if still in-flight, abort fetch
        controller.abort();
      } catch (e) {
        // ignoring cleanup errors
      }
    }
  },

  getSearchResultFromHistory: async (id: string): Promise<SemanticSearchResultById> => {
    const response = await api.get<HistorySearchResponse>(`/search/chat/${id}/history`)
    const historyData = response.data

    return {
      id: historyData.id,
      query: historyData.query,
      answer: {
        introduction: historyData.output || '',
        elements: []
      },
      citations: [],
      searchedAt: new Date().toISOString(),
      sourcesCount: historyData.sources.length || 0,
      sources: historyData.sources
    } as SemanticSearchResultById & { sources: HistorySearchResponse['sources'] }
  },

  getChatHistory: async (chatId: string, page: number = 1, pageSize: number = 10): Promise<ChatHistoryResponse> => {
    try {
      const response = await api.get<ChatHistoryResponse>(`/search/chat/${chatId}/history?page=${page}&page_size=${pageSize}`);
      return response.data;
    } catch (error) {
      return {
        results: [],
        page: page,
        page_size: pageSize
      };
    }
  },


  getSuggestions: async (query: string): Promise<Array<string>> => {
    const response = await api.get(`/search/suggestions?query=${encodeURIComponent(query)}`)
    return response.data
  },

  getSearchHistory: async (page: number = 1, pageSize: number = 10): Promise<SearchHistoryResponse> => {
    try {
      const response = await api.get(`/search/chat/history?page=${page}&page_size=${pageSize}`);
      return response.data;
    } catch (error) {
      return {
        results: [],
        page: page,
        page_size: pageSize,
        total: 0
      };
    }
  },

  deleteSearchHistory: async (chatId: string): Promise<void> => {
    await api.delete(`/search/session/${chatId}`);
  },

  stopStreamingResponse: async (jobId: string): Promise<{ message: string }> => {
    const response = await api.post('/search/chat/stop', { job_id: jobId })
    return response.data
  },

  submitFeedback: async (jobId: string, reaction: 'like' | 'dislike', feedbackText?: string): Promise<{ message: string; id: string }> => {
    const response = await api.post(`/search/jobs/${jobId}/feedback`, {
      reaction,
      feedback_text: feedbackText || ""
    })
    return response.data
  },

  deleteFeedback: async (jobId: string, feedbackId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/search/jobs/${jobId}/feedback/${feedbackId}`)
    return response.data
  },

  createSearchJob: async (
    params: SemanticSearchRequest,
  ): Promise<{ chatId: string; metadata?: Record<string, unknown> }> => {
    const response = await api.post('/search/session', params)
    const chatId =
      response.data?.chatId ?? response.data?.chat_id ?? response.data?.jobId ?? response.data?.job_id ?? response.data?.id ?? null

    if (!chatId || typeof chatId !== 'string') {
      throw new Error('Semantic search chat ID not found in response')
    }

    const metadata =
      response.data && typeof response.data === 'object'
        ? Object.fromEntries(
          Object.entries(response.data).filter(([key]) => key !== 'chatId' && key !== 'chat_id' && key !== 'jobId' && key !== 'job_id' && key !== 'id'),
        )
        : undefined

    return {
      chatId,
      metadata,
    }
  },

  sendChatMessage: async (
    chatId: string,
    query: string,
    onUpdate?: (partialResult: Partial<SemanticSearchResultById>) => void,
    onThinkingUpdate?: (message: string) => void,
    onModeChange?: (mode: 'thinking' | 'response' | 'error') => void,
    onErrorUpdate?: (message: string) => void,
    onJobId?: (jobId: string) => void,
    abortController?: AbortController
  ): Promise<SemanticSearchResultById> => {
    const accessToken = Cookies.get('access_token');
    const url = `${API_BASE_URL}/search/chat`;

    const headers: HeadersInit = {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const controller = abortController || new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ chat_id: chatId, query }),
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store',
        signal: controller.signal,
      });

      // Basic HTTP checks
      if (!response.ok) {
        const errorText =
          await response.text().catch(() => 'Unable to read error response');
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      reader = response.body.getReader();

      const decoder = new TextDecoder();
      let buffer = '';
      const allEvents: Array<string> = [];
      const allResponseMessages: Array<string> = [];
      const allMetadata: Array<Record<string, any>> = [];
      let currentMode: 'thinking' | 'response' | 'error' | 'metadata' | null = null;
      let hasNotifiedModeChange = false;
      let extractedJobId: string | undefined = undefined;

      // Unified streaming loop
      let chunkCount = 0;
      let done = false;
      let consecutiveEmptyCount = 0;
      let lastWasEmpty = false;

      while (!done) {
        chunkCount++;
        const { done: rDone, value } = await reader.read();
        done = rDone;

        if (value && value.length) {
          buffer += decoder.decode(value, { stream: true });
          const { events, thinkingMessages, responseMessages, errorMessages, metadataMessages, remainder, currentMode: newMode, jobId } = parseSSEChunk(buffer);
          
          // Call onJobId callback as soon as job_id is extracted
          if (jobId && !extractedJobId && onJobId) {
            extractedJobId = jobId;
            onJobId(jobId);
          }
          
          // Handle metadata messages - extract job_id
          if (metadataMessages.length > 0) {
            allMetadata.push(...metadataMessages);
            // Extract job_id from the first metadata message (fallback for old format)
            if (!extractedJobId) {
              for (const metadata of metadataMessages) {
                if (metadata.job_id) {
                  extractedJobId = metadata.job_id;
                  if (onJobId) {
                    onJobId(metadata.job_id);
                  }
                  break;
                }
              }
            }
          }
          
          // Handle thinking messages
          if (thinkingMessages.length > 0 && onThinkingUpdate) {
            thinkingMessages.forEach(msg => onThinkingUpdate(msg));
          }
          
          // Handle error messages
          if (errorMessages.length > 0) {
            if (onErrorUpdate) {
              errorMessages.forEach(msg => onErrorUpdate(msg));
            }
            if (onModeChange && currentMode !== 'error') {
              onModeChange('error');
            }
          }
          
          // Handle mode change from thinking to response or error
          if (newMode && newMode !== currentMode) {
            currentMode = newMode;
            if ((currentMode === 'response' || currentMode === 'error') && !hasNotifiedModeChange && onModeChange) {
              onModeChange(currentMode);
              hasNotifiedModeChange = true;
            }
          }
          
          // Handle response messages - accumulate them
          if (responseMessages.length > 0) {
            allResponseMessages.push(...responseMessages);
            allEvents.push(...responseMessages);
            
            // Call onUpdate with buffered response content
            if (onUpdate) {
              try {
                const bufferedContent = allResponseMessages.join('');
                const partialResult: Partial<SemanticSearchResultById> = {
                  id: chatId,
                  answer: {
                    introduction: bufferedContent,
                    elements: [],
                  },
                };
                onUpdate(partialResult);
              } catch (error) {
                // Ignore parsing errors for partial data
              }
            }
          }

          // Track consecutive empty events
          if (events.length === 0 && thinkingMessages.length === 0 && responseMessages.length === 0 && errorMessages.length === 0) {
            const allContent = allEvents.join('');
            const markdownStartPattern = /(^|\n)(#{1,3}\s*[^\n#]*)/g;
            const matches = Array.from(allContent.matchAll(markdownStartPattern));
            let hasUnclosedMarkdown = false;

            if (matches.length > 0) {
              const lastMatch = matches[matches.length - 1];
              const lastMatchIndex = lastMatch.index + lastMatch[0].length;
              const contentAfterLastMarkdown = allContent.substring(lastMatchIndex);
              const hasClosingMarker = contentAfterLastMarkdown.includes('[]');
              hasUnclosedMarkdown = !hasClosingMarker;
            }

            if (hasUnclosedMarkdown) {
              allEvents.push('[]');
              consecutiveEmptyCount = 0;
              lastWasEmpty = true;
            } else {
              if (lastWasEmpty) {
                allEvents.push('\n\n');
                lastWasEmpty = false;
                consecutiveEmptyCount = 0;
              } else {
                consecutiveEmptyCount++;
                if (consecutiveEmptyCount === 2) {
                  allEvents.push('\n\n');
                  consecutiveEmptyCount = 0;
                }
                lastWasEmpty = true;
              }
            }
          } else {
            consecutiveEmptyCount = 0;
            lastWasEmpty = false;
            allEvents.push(...events);
          }

          // Call onUpdate with partial result as data arrives
          if (onUpdate && events.length > 0) {
            try {
              const { content, markdown } = joinEvents(allEvents);
              const partialPayload = markdown ? `${content}\n\n${markdown}` : content;
              const partialResult = parseSemanticSearchStream(partialPayload, chatId);
              onUpdate(partialResult);
            } catch (error) {
              // Ignore parsing errors for partial data
            }
          }

          buffer = remainder;
        } else if (!done && !value) {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }

      // Final decode flush
      const finalChunk = decoder.decode();
      if (finalChunk) {
        buffer += finalChunk;
      }

      if (buffer.trim()) {
        const { events, remainder } = parseSSEChunk(buffer + '\n\n');
        if (events.length === 0) {
          allEvents.push('\n');
        } else {
          allEvents.push(...events);
        }
        if (remainder.trim()) {
          allEvents.push(remainder.trim());
        }
      }

      // Extract sources from metadata
      let extractedSources: SearchSource[] = []
      if (allMetadata.length > 0) {
        for (const metadata of allMetadata) {
          if (metadata.sources && Array.isArray(metadata.sources)) {
            extractedSources = metadata.sources
            break // Take the first sources array found
          }
        }
      }

      // If we have response messages from the new format, use them directly
      if (allResponseMessages.length > 0) {
        const bufferedContent = allResponseMessages.join('');
        return {
          id: chatId,
          query: query,
          answer: {
            introduction: bufferedContent,
            elements: [],
          },
          citations: [],
          searchedAt: new Date().toISOString(),
          sourcesCount: extractedSources.length,
          sources: extractedSources,
          jobId: extractedJobId,
        };
      }

      // Otherwise, use the old format parsing
      const { content, markdown } = joinEvents(allEvents);
      const payloadString = markdown ? `${content}\n\n${markdown}` : content;
      const trimmedPayload = payloadString.trimEnd();
      if (trimmedPayload.trim().length === 0) {
        throw new Error(
          'No data received from SSE stream. Browser buffering detected or server sent empty stream.'
        );
      }

      const result = parseSemanticSearchStream(trimmedPayload, chatId);
      return {
        ...result,
        query: query,
        jobId: extractedJobId,
      };
    } finally {
      try {
        if (reader) {
          await reader.cancel().catch(() => { });
          reader.releaseLock();
        }
      } catch (e) {
        // ignoring cleanup errors
      }
      try {
        controller.abort();
      } catch (e) {
        // ignoring cleanup errors
      }
    }
  },
}
