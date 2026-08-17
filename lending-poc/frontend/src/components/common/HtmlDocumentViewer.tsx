import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'

type HtmlDocumentViewerProps =
  | { mode: 'html'; html: string; className?: string }
  | { mode: 'text'; text: string; className?: string }

/**
 * Renders either sanitized backend HTML (OCR results) or plain text
 * (translation results). HTML is always run through DOMPurify before
 * being injected — never render unsanitized dangerouslySetInnerHTML.
 */
export function HtmlDocumentViewer(props: HtmlDocumentViewerProps) {
  const containerClass = cn(
    'max-h-[32rem] overflow-auto rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-card',
    props.className
  )

  if (props.mode === 'text') {
    return (
      <div className={containerClass}>
        <pre className="whitespace-pre-wrap break-words font-mono text-slate-800">{props.text}</pre>
      </div>
    )
  }

  return <SanitizedHtml html={props.html} containerClass={containerClass} />
}

function SanitizedHtml({ html, containerClass }: { html: string; containerClass: string }) {
  const sanitized = useMemo(() => DOMPurify.sanitize(html), [html])

  // Safe: `sanitized` is the DOMPurify-cleaned output computed above.
  return (
    <div
      className={cn(containerClass, 'prose-sm max-w-none')}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
