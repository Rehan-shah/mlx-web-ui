import { Clipboard } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import type { ExtraProps } from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

type CodeBlockProps = ComponentPropsWithoutRef<'code'> & ExtraProps

export default function CodeBlock({ children, className, node, ...rest }: CodeBlockProps) {
    const match = /language-(\w+)/i.exec(className || '')
    if (!match) {
        return <code {...rest} className={className}>{children}</code>
    }
    const language = match[1].toLowerCase()
    const code = String(children).replace(/\n$/, '')
    return (
        <div className='my-3 overflow-hidden rounded-xl border border-line'>
            <div className='flex justify-between border-b border-line bg-panel px-4 py-2 font-mono text-xs text-muted'>
                <span>{language}</span>
                <button
                    type='button'
                    className='flex items-center gap-1 hover:text-fg'
                    aria-label={`Copy ${language} code`}
                    onClick={() => void navigator.clipboard.writeText(code)}
                >
                    <Clipboard className='w-3 h-3' aria-hidden='true' /> Copy code
                </button>
            </div>
            <SyntaxHighlighter
                PreTag="div"
                style={document.documentElement.classList.contains("dark") ? oneDark : oneLight}
                language={language}
                customStyle={{ margin: 0, borderRadius: 0, fontSize: "13px", background: "rgb(var(--panel))" }}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    )
}
