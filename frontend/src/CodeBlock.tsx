import { Clipboard } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import type { ExtraProps } from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'

type CodeBlockProps = ComponentPropsWithoutRef<'code'> & ExtraProps

export default function CodeBlock({ children, className, node, ...rest }: CodeBlockProps) {
    const match = /language-(\w+)/i.exec(className || '')
    if (!match) {
        return <code {...rest} className={className}>{children}</code>
    }
    const language = match[1].toLowerCase()
    const code = String(children).replace(/\n$/, '')
    return (
        <>
            <div className='flex justify-between text-xs px-4 bg-[#f9f9f9] py-2 rounded-t-md -mb-2 w-full mt-2'>
                <span>{language}</span>
                <button
                    type='button'
                    className='flex items-center gap-1'
                    aria-label={`Copy ${language} code`}
                    onClick={() => void navigator.clipboard.writeText(code)}
                >
                    <Clipboard className='w-3 h-3' aria-hidden='true' /> Copy code
                </button>
            </div>
            <SyntaxHighlighter
                PreTag="div"
                language={language}
                className="rounded-b-md"
            >
                {code}
            </SyntaxHighlighter>
        </>
    )
}
