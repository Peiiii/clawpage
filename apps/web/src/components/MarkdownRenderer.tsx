import 'highlight.js/styles/github-dark.min.css'
import { useState, useCallback } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { cn } from '@/lib/utils'
import { Check, Copy } from 'lucide-react'

// Allow highlight.js class names through sanitization
const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        code: [
            ...(defaultSchema.attributes?.code ?? []),
            ['className', /^language-/, /^hljs/],
        ],
        span: [
            ...(defaultSchema.attributes?.span ?? []),
            ['className', /^hljs/],
        ],
    },
}

const remarkPlugins = [remarkGfm]
const rehypePlugins = [
    rehypeHighlight,
    [rehypeSanitize, sanitizeSchema],
] as const

// ── Code Block with Copy Button ──────────────────────────────────────

function CodeBlock({ children }: { children: React.ReactNode }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = useCallback(() => {
        // We need to get the text content from children
        // The children of <pre> is a <code> element rendered by ReactMarkdown
        const textContent =
            typeof children === 'string'
                ? children
                : extractTextFromChildren(children)

        navigator.clipboard.writeText(textContent).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }, [children])

    return (
        <div className="code-block-wrapper group/code relative my-4">
            <pre>{children}</pre>
            <button
                type="button"
                onClick={handleCopy}
                className="copy-button"
                aria-label="Copy code"
            >
                {copied ? (
                    <span className="flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Copied
                    </span>
                ) : (
                    <span className="flex items-center gap-1">
                        <Copy className="w-3 h-3" />
                        Copy
                    </span>
                )}
            </button>
        </div>
    )
}

function extractTextFromChildren(node: React.ReactNode): string {
    if (typeof node === 'string') return node
    if (typeof node === 'number') return String(node)
    if (node == null || typeof node === 'boolean') return ''
    if (Array.isArray(node)) return node.map(extractTextFromChildren).join('')
    if (typeof node === 'object' && node !== null && 'props' in node) {
        const element = node as { props: { children?: React.ReactNode } }
        return extractTextFromChildren(element.props.children)
    }
    return ''
}

// ── Shared component overrides (module-level constant = never re-created) ──

const COMPONENTS: Components = {
    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,

    pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,

    code: ({ children, className }) => {
        // If className exists, it's a fenced code block (inside <pre>) — don't add inline styles
        if (className) {
            return <code className={className}>{children}</code>
        }
        // Inline code
        return <code className="inline-code">{children}</code>
    },

    a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noreferrer" className="markdown-link">
            {children}
        </a>
    ),

    table: ({ children }) => (
        <div className="overflow-x-auto my-4 rounded-lg border border-border/50">
            <table className="markdown-table">{children}</table>
        </div>
    ),

    input: ({ checked, disabled, ...rest }) => (
        <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            readOnly
            className="task-checkbox"
            {...rest}
        />
    ),
}

// ── Public API ──────────────────────────────────────────────────────────

interface MarkdownRendererProps {
    children: string
    className?: string
}

export function MarkdownRenderer({
    children,
    className,
}: MarkdownRendererProps) {
    return (
        <ReactMarkdown
            className={cn(
                'prose prose-sm dark:prose-invert max-w-none break-words',
                className,
            )}
            remarkPlugins={remarkPlugins}
            // @ts-expect-error -- rehype-sanitize schema typing is overly strict
            rehypePlugins={rehypePlugins}
            components={COMPONENTS}
        >
            {children}
        </ReactMarkdown>
    )
}
