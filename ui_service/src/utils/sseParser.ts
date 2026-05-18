/**
 * SSE (Server-Sent Events) Parser for Semantic Search Results
 * 
 * Handles streaming JSON events and converts them into structured content blocks
 * for rendering semantic search results.
 */

// Types for SSE events
export interface BlockStartEvent {
  type: 'block_start'
  blockId: string
  kind: 'header' | 'paragraph' | 'list' | 'table'
  meta?: {
    level?: number // for headers
    ordered?: boolean // for lists
    headers?: Array<string> | Array<{ [key: string]: any }> // for tables
    caption?: string // for tables
    format?: string // for tables - basic, complex, etc.
    columnConfig?: Array<any> // for tables - width, alignment, etc.
    [key: string]: unknown
  }
}

export interface TokenEvent {
  type: 'token'
  blockId: string
  content: string
}

export interface ChunkEvent {
  type: 'chunk'
  blockId: string
  content: string
}

export interface ListItemEvent {
  type: 'list_item'
  blockId: string
  itemId: string
  content: string
}

export interface TableRowEvent {
  type: 'table_row'
  blockId: string
  rowId: string
  cells?: Array<string> // Basic format: array of strings
  data?: { [key: string]: any } // Complex format: object with keys
  rowMeta?: { // Additional metadata
    isHeader?: boolean
    groupId?: string
    [key: string]: any
  }
}

export interface TableCellEvent {
  type: 'table_cell'
  blockId: string
  rowId: string
  cellId: string | number
  content: string | { [key: string]: any }
  meta?: {
    colspan?: number
    rowspan?: number
    alignment?: 'left' | 'center' | 'right'
    [key: string]: any
  }
}

export interface BlockEndEvent {
  type: 'block_end'
  blockId: string
}

export interface MetaEvent {
  type: 'meta'
  citations?: Array<{
    title: string
    url: string
    [key: string]: unknown
  }>
  [key: string]: unknown
}

export interface DoneEvent {
  type: 'done'
}

export interface PlainTextEvent {
  type: 'plain_text'
  content: string
}

export type SSEEvent =
  | BlockStartEvent
  | TokenEvent
  | ChunkEvent
  | ListItemEvent
  | TableRowEvent
  | TableCellEvent
  | BlockEndEvent
  | MetaEvent
  | DoneEvent
  | PlainTextEvent

// Type for table data
export interface TableData {
  format: string
  headers: Array<any>
  rows: Array<any>
  caption?: string
  meta: Record<string, unknown>
}

// Internal representation of blocks during parsing
interface ParsedBlock {
  blockId: string
  kind: 'header' | 'paragraph' | 'list' | 'table'
  content: string
  meta?: Record<string, unknown>
  listItems?: Array<{
    itemId: string
    content: string
  }>
  table?: TableData
  isComplete: boolean
}

interface ParsedResult {
  blocks: Map<string, ParsedBlock>
  citations: Array<{
    title: string
    url: string
    [key: string]: unknown
  }>
  isComplete: boolean
}

/**
 * Parses a single SSE data line
 */
function parseSSELine(line: string): SSEEvent | null {
  // SSE format: "data: {...json...}"
  if (!line.startsWith('data: ')) {
    return null
  }

  const jsonStr = line.substring(6) // Remove "data: " prefix

  try {
    return JSON.parse(jsonStr) as SSEEvent
  } catch (error) {
    return {
      type: 'plain_text',
      content: jsonStr,
    }
  }
}

/**
 * Processes SSE events and accumulates blocks
 */
function processEvent(
  event: SSEEvent,
  result: ParsedResult,
): ParsedResult {
  switch (event.type) {
    case 'block_start': {
      const block: ParsedBlock = {
        blockId: event.blockId,
        kind: event.kind,
        content: '',
        meta: event.meta,
        listItems: event.kind === 'list' ? [] : undefined,
        isComplete: false,
      }

      // Handle table initialization
      if (event.kind === 'table') {
        block.table = {
          format: event.meta?.format || 'basic',
          headers: event.meta?.headers || [],
          rows: [],
          caption: event.meta?.caption,
          meta: { ...event.meta }
        }
      }

      result.blocks.set(event.blockId, block)
      break
    }

    case 'token':
    case 'chunk': {
      const block = result.blocks.get(event.blockId)
      if (block) {
        block.content += event.content
      }
      break
    }

    case 'list_item': {
      const block = result.blocks.get(event.blockId)
      if (block && block.kind === 'list' && block.listItems) {
        block.listItems.push({
          itemId: event.itemId,
          content: event.content,
        })
      }
      break
    }

    case 'table_row': {
      const block = result.blocks.get(event.blockId)
      if (block?.kind === 'table' && block.table) {
        // Store row data in a flexible format
        const rowData = {
          id: event.rowId,
          cells: event.cells || [],
          data: event.data || {},
          meta: event.rowMeta || {}
        }
        block.table.rows.push(rowData)
      }
      break
    }

    case 'table_cell': {
      const block = result.blocks.get(event.blockId)
      if (block?.kind === 'table' && block.table) {
        // Find the row
        const row = block.table.rows.find(r => r.id === event.rowId)
        if (row) {
          // Handle both positional and keyed cells
          if (typeof event.cellId === 'number') {
            // Positional cell
            if (!row.cells) row.cells = []
            row.cells[event.cellId] = {
              content: event.content,
              meta: event.meta
            }
          } else {
            // Named cell
            if (!row.data) row.data = {}
            row.data[event.cellId] = {
              content: event.content,
              meta: event.meta
            }
          }
        }
      }
      break
    }

    case 'block_end': {
      const block = result.blocks.get(event.blockId)
      if (block) {
        block.isComplete = true
      }
      break
    }

    case 'meta': {
      if (event.citations) {
        result.citations = event.citations
      }
      break
    }

    case 'plain_text': {
      const blockId = `plain-${result.blocks.size + 1}`
      const block: ParsedBlock = {
        blockId,
        kind: 'paragraph',
        content: event.content,
        isComplete: true,
      }
      result.blocks.set(blockId, block)
      break
    }

    case 'done': {
      result.isComplete = true
      break
    }
  }

  return result
}

/**
 * Converts parsed blocks into structured content for components
 */
export interface SemanticSearchResult {
  introduction: string
  elements: Array<{
    number: number
    title: string
    description: string
    tables?: Array<TableData>
  }>
}

export interface ParsedSemanticSearchData {
  answer: SemanticSearchResult
  citations: Array<{
    title: string
    url: string
    [key: string]: unknown
  }>
  isComplete: boolean
}

/**
 * Converts parsed blocks into the format expected by AnswerTabContent
 */
function convertBlocksToAnswerFormat(
  blocks: Map<string, ParsedBlock>,
): SemanticSearchResult {
  const blockArray = Array.from(blocks.values())
    .filter((block) => block.isComplete)
    .sort((a, b) => a.blockId.localeCompare(b.blockId))

  let introduction = ''
  const elements: Array<{
    number: number
    title: string
    description: string
    tables?: Array<TableData>
  }> = []

  let currentElement: {
    number: number
    title: string
    description: string
    tables?: Array<TableData>
  } | null = null

  for (const block of blockArray) {
    if (block.kind === 'header') {
      // If we have a pending element, save it
      if (currentElement && currentElement.title) {
        elements.push(currentElement)
      }

      // Start new element or use header as title
      const headerText = block.content.trim()
      if (!currentElement) {
        // First header might be the introduction title
        if (elements.length === 0 && introduction === '') {
          // Treat first header as part of intro or skip
          continue
        }
        currentElement = {
          number: elements.length + 1,
          title: headerText,
          description: '',
        }
      } else {
        currentElement.title = headerText
      }
    } else if (block.kind === 'paragraph') {
      const paragraphText = block.content.trim()

      if (!currentElement) {
        // If no current element, this is part of introduction
        if (introduction) {
          introduction += ' ' + paragraphText
        } else {
          introduction = paragraphText
        }
      } else {
        // Add to current element description
        if (currentElement.description) {
          currentElement.description += ' ' + paragraphText
        } else {
          currentElement.description = paragraphText
        }
      }
    } else if (block.kind === 'list' && block.listItems) {
      // Convert list items to description text
      const listText = block.listItems
        .map((item) => `• ${item.content.trim()}`)
        .join('\n')

      if (!currentElement) {
        if (introduction) {
          introduction += '\n\n' + listText
        } else {
          introduction = listText
        }
      } else {
        if (currentElement.description) {
          currentElement.description += '\n\n' + listText
        } else {
          currentElement.description = listText
        }
      }
    } else if (block.kind === 'table' && block.table) {
      // Handle table blocks
      const tableData = block.table

      if (!currentElement) {
        // Tables in introduction - for now, we'll just mention there's a table
        // In a more advanced implementation, we might want to include tables in intro
        if (introduction) {
          introduction += '\n\n[Table: ' + (tableData.caption || 'Data') + ']'
        } else {
          introduction = '[Table: ' + (tableData.caption || 'Data') + ']'
        }
      } else {
        // Add to current element
        if (!currentElement.tables) {
          currentElement.tables = []
        }
        currentElement.tables.push(tableData)
      }
    }
  }

  // Don't forget the last element
  if (currentElement && currentElement.title) {
    elements.push(currentElement)
  }

  // Ensure we have at least an introduction
  if (!introduction && elements.length > 0) {
    introduction = 'Here are the key points:'
  }

  return {
    introduction: introduction || '',
    elements: elements.length > 0 ? elements : [],
  }
}

/**
 * Main SSE handler that processes stream and returns structured data
 */
export interface SSEHandlerOptions {
  onUpdate?: (data: ParsedSemanticSearchData) => void
  onComplete?: (data: ParsedSemanticSearchData) => void
  onError?: (error: Error) => void
}

/**
 * Creates an SSE handler that processes the stream and calls callbacks
 */
export function createSSEHandler(
  options: SSEHandlerOptions = {},
): (reader: ReadableStreamDefaultReader<Uint8Array>) => Promise<ParsedSemanticSearchData> {
  return async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const result: ParsedResult = {
      blocks: new Map(),
      citations: [],
      isComplete: false,
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      for (; ;) {
        const chunk = await reader.read()

        if (chunk.done) {
          break
        }

        // Decode and accumulate chunks
        buffer += decoder.decode(chunk.value, { stream: true })

        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          const event = parseSSELine(trimmedLine)
          if (!event) continue

          processEvent(event, result)

          // Create intermediate result for onUpdate callback
          if (options.onUpdate) {
            const answer = convertBlocksToAnswerFormat(result.blocks)
            const parsedData: ParsedSemanticSearchData = {
              answer,
              citations: result.citations,
              isComplete: result.isComplete,
            }
            options.onUpdate(parsedData)
          }

          // If done, break early
          if (result.isComplete) {
            break
          }
        }

        if (result.isComplete) {
          break
        }
      }

      // Final result
      const answer = convertBlocksToAnswerFormat(result.blocks)
      const finalData: ParsedSemanticSearchData = {
        answer,
        citations: result.citations,
        isComplete: true,
      }

      if (options.onComplete) {
        options.onComplete(finalData)
      }

      return finalData
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      if (options.onError) {
        options.onError(err)
      }
      throw err
    }
  }
}

/**
 * Utility function to fetch and handle SSE stream
 */
export async function fetchSemanticSearchSSE(
  url: string,
  options: {
    body?: unknown
    headers?: Record<string, string>
    onUpdate?: (data: ParsedSemanticSearchData) => void
    onComplete?: (data: ParsedSemanticSearchData) => void
    onError?: (error: Error) => void
    signal?: AbortSignal
    credentials?: RequestCredentials
  } = {},
): Promise<ParsedSemanticSearchData> {
  const {
    body,
    headers,
    onUpdate,
    onComplete,
    onError,
    signal,
    credentials = 'include',
  } = options

  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...(headers ?? {}),
      ...(body ? {
        'Content-Type': 'application/json',
      } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
    credentials,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('text/event-stream')) {
    const textResponse = await response.text()
    const answer = {
      introduction: textResponse,
      elements: [],
    }
    const finalData: ParsedSemanticSearchData = {
      answer,
      citations: [],
      isComplete: true,
    }

    onUpdate?.(finalData)
    onComplete?.(finalData)

    return finalData
  }

  if (!response.body) {
    throw new Error('Response body is null')
  }

  const reader = response.body.getReader()
  const handler = createSSEHandler({
    onUpdate,
    onComplete,
    onError,
  })

  return handler(reader)
}
