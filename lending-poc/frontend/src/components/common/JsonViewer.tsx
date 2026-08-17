import { useState, useCallback, useId, type ReactNode } from 'react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

interface JsonViewerProps {
  data: unknown
  className?: string
}

/**
 * Hand-rolled JSON tree viewer (no third-party dependency): supports
 * per-node expand/collapse, expand-all/collapse-all, copy-to-clipboard,
 * and correct rendering of objects/arrays/null/primitives/empty values.
 * Hand-rolling keeps full control over styling (Tailwind, already the
 * system in use) without fighting a third-party component's API surface.
 */
export function JsonViewer({ data, className }: JsonViewerProps) {
  const [collapseSignal, setCollapseSignal] = useState(0)
  const [expandSignal, setExpandSignal] = useState(0)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [data])

  return (
    <div className={cn('rounded-md border border-gray-200 bg-white', className)}>
      <div className="flex items-center justify-end gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
        <Button
          type="button"
          className="bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
          onClick={() => setExpandSignal((n) => n + 1)}
        >
          Expand all
        </Button>
        <Button
          type="button"
          className="bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
          onClick={() => setCollapseSignal((n) => n + 1)}
        >
          Collapse all
        </Button>
        <Button
          type="button"
          className="bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
          onClick={handleCopy}
        >
          {copied ? 'Copied' : 'Copy JSON'}
        </Button>
      </div>
      <div className="max-h-[32rem] overflow-auto p-3 font-mono text-xs">
        <JsonNode
          value={data}
          nodeKey={null}
          depth={0}
          collapseSignal={collapseSignal}
          expandSignal={expandSignal}
          isLast
        />
      </div>
    </div>
  )
}

interface JsonNodeProps {
  value: unknown
  nodeKey: string | null
  depth: number
  collapseSignal: number
  expandSignal: number
  isLast: boolean
}

function JsonNode({ value, nodeKey, depth, collapseSignal, expandSignal, isLast }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(depth < 1)
  const [lastCollapseSignal, setLastCollapseSignal] = useState(collapseSignal)
  const [lastExpandSignal, setLastExpandSignal] = useState(expandSignal)
  const reactId = useId()

  if (collapseSignal !== lastCollapseSignal) {
    setLastCollapseSignal(collapseSignal)
    if (expanded) setExpanded(false)
  }
  if (expandSignal !== lastExpandSignal) {
    setLastExpandSignal(expandSignal)
    if (!expanded) setExpanded(true)
  }

  const keyLabel = nodeKey !== null ? <span className="text-blue-700">"{nodeKey}"</span> : null
  const comma = isLast ? '' : ','

  if (value === null) {
    return (
      <Leaf
        keyLabel={keyLabel}
        valueNode={<span className="text-gray-400">null</span>}
        comma={comma}
      />
    )
  }
  if (value === undefined) {
    return (
      <Leaf
        keyLabel={keyLabel}
        valueNode={<span className="text-gray-400">undefined</span>}
        comma={comma}
      />
    )
  }
  if (typeof value === 'string') {
    return (
      <Leaf
        keyLabel={keyLabel}
        valueNode={<span className="text-green-700">"{value}"</span>}
        comma={comma}
      />
    )
  }
  if (typeof value === 'number') {
    return (
      <Leaf
        keyLabel={keyLabel}
        valueNode={<span className="text-purple-700">{value}</span>}
        comma={comma}
      />
    )
  }
  if (typeof value === 'boolean') {
    return (
      <Leaf
        keyLabel={keyLabel}
        valueNode={<span className="text-orange-700">{String(value)}</span>}
        comma={comma}
      />
    )
  }

  const isArray = Array.isArray(value)
  const entries: [string, unknown][] = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>)
  const openBracket = isArray ? '[' : '{'
  const closeBracket = isArray ? ']' : '}'

  if (entries.length === 0) {
    return (
      <Leaf
        keyLabel={keyLabel}
        valueNode={
          <span className="text-gray-500">
            {openBracket}
            {closeBracket}
          </span>
        }
        comma={comma}
      />
    )
  }

  return (
    <div>
      <div className="flex items-start gap-1">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={reactId}
          onClick={() => setExpanded((e) => !e)}
          className="mt-0.5 w-4 shrink-0 select-none text-gray-500 hover:text-gray-800"
        >
          {expanded ? '▾' : '▸'}
        </button>
        <div>
          {keyLabel && <>{keyLabel}: </>}
          <span className="text-gray-500">{openBracket}</span>
          {!expanded && (
            <span className="text-gray-400">
              {' '}
              {entries.length}{' '}
              {isArray
                ? 'item' + (entries.length === 1 ? '' : 's')
                : 'key' + (entries.length === 1 ? '' : 's')}{' '}
            </span>
          )}
          {!expanded && (
            <span className="text-gray-500">
              {closeBracket}
              {comma}
            </span>
          )}
        </div>
      </div>
      {expanded && (
        <div id={reactId} className="ml-5 border-l border-gray-100 pl-3">
          {entries.map(([k, v], i) => (
            <JsonNode
              key={k}
              value={v}
              nodeKey={isArray ? null : k}
              depth={depth + 1}
              collapseSignal={collapseSignal}
              expandSignal={expandSignal}
              isLast={i === entries.length - 1}
            />
          ))}
          <div className="text-gray-500">
            {closeBracket}
            {comma}
          </div>
        </div>
      )}
    </div>
  )
}

function Leaf({
  keyLabel,
  valueNode,
  comma,
}: {
  keyLabel: ReactNode
  valueNode: ReactNode
  comma: string
}) {
  return (
    <div className="whitespace-pre pl-5">
      {keyLabel && <>{keyLabel}: </>}
      {valueNode}
      {comma}
    </div>
  )
}
