import { 
  Box, 
  Text,
} from '@chakra-ui/react'
import type { TableData } from '@/utils/sseParser'

interface TableContentProps {
  data: TableData
}

/**
 * Component for rendering table data received from semantic search results.
 * Uses a simplified HTML table approach styled with Chakra UI.
 */
const TableContent = ({ data }: TableContentProps) => {
  // Function to extract cell content regardless of format
  const getCellContent = (cell: any): string => {
    if (typeof cell === 'string') return cell
    if (typeof cell === 'number') return String(cell)
    if (cell?.content) return String(cell.content)
    return ''
  }

  // Function to extract header content
  const getHeaderContent = (header: any): string => {
    if (typeof header === 'string') return header
    if (header?.label) return header.label
    if (header?.name) return header.name
    if (header?.content) return header.content
    return ''
  }

  // Determine if headers are present and get them in a usable format
  const headers = Array.isArray(data.headers) && data.headers.length > 0 
    ? data.headers 
    : []

  // Process rows based on format
  const processRows = () => {
    if (!data.rows || !Array.isArray(data.rows) || data.rows.length === 0) {
      return []
    }

    // Handle different row formats
    return data.rows.map(row => {
      // For basic array format
      if (Array.isArray(row.cells) && row.cells.length > 0) {
        return row.cells
      }
      // For object format with data property
      else if (row.data && typeof row.data === 'object') {
        // If we have headers with keys, use them to order the data
        if (headers.length > 0 && typeof headers[0] !== 'string') {
          const keyedHeaders = headers.filter(h => h.key || h.name)
          if (keyedHeaders.length > 0) {
            return keyedHeaders.map(header => {
              const key = header.key || header.name
              return row.data[key] || ''
            })
          }
        }
        // Otherwise just return the values
        return Object.values(row.data)
      }
      // Fallback empty row
      return []
    })
  }

  const rows = processRows()

  // If no data, don't render anything
  if (rows.length === 0 || (headers.length === 0 && rows[0].length === 0)) {
    return null
  }

  return (
    <Box mt={4} mb={4}>
      {data.caption && (
        <Text fontSize="sm" fontWeight="medium" mb={2} textAlign="center" color="gray.600">
          {data.caption}
        </Text>
      )}
      
      <Box overflowX="auto">
        <Box 
          as="table" 
          width="100%" 
          borderWidth="1px" 
          borderRadius="md" 
          borderColor="gray.200"
          fontSize="sm"
        >
          {headers.length > 0 && (
            <Box as="thead" bg="blue.50">
              <Box as="tr">
                {headers.map((header, idx) => (
                  <Box 
                    key={idx} 
                    as="th" 
                    textAlign="left" 
                    color="blue.700" 
                    fontWeight="semibold" 
                    p={2} 
                    borderBottomWidth="1px"
                  >
                    {getHeaderContent(header)}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
          <Box as="tbody">
            {rows.map((row, rowIdx) => (
              <Box 
                key={rowIdx} 
                as="tr" 
                bg={rowIdx % 2 === 1 ? 'gray.50' : 'white'}
              >
                {Array.isArray(row) ? (
                  row.map((cell, cellIdx) => (
                    <Box 
                      key={cellIdx} 
                      as="td" 
                      p={2} 
                      borderTopWidth="1px" 
                      borderColor="gray.200"
                      whiteSpace="normal"
                    >
                      {getCellContent(cell)}
                    </Box>
                  ))
                ) : (
                  <Box 
                    as="td" 
                    p={2} 
                    borderTopWidth="1px" 
                    borderColor="gray.200"
                  >
                    {getCellContent(row)}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default TableContent
