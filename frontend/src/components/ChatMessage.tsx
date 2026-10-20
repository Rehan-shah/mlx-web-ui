import { Copy } from 'lucide-react'
import Markdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import { cn } from '@/lib/utils'
import CodeBlock from '@/CodeBlock'

type ChatMessageProps = {
    text: string,
    role: "user" | "assistant",
    loading?: boolean,
}

export default function ChatMessage({ text, role, loading = false }: ChatMessageProps) {
    const body = loading
        ? <p className='flex items-center gap-1 py-1 text-muted' aria-label='Loading'>
            <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-current' />
            <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]' />
            <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]' />
        </p>
        : <Markdown className='prose-chat w-full text-wrap break-words text-left'
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{ code: CodeBlock }}
        >{text}</Markdown>

    if (role === "user") {
        return (
            <div className='mb-6 flex justify-end'>
                <div className='max-w-[85%] rounded-2xl bg-hover px-4 py-2 text-[15px] leading-relaxed [&_p]:my-0'>{body}</div>
            </div>
        )
    }

    return (
        <div className={cn('group mb-8 text-[15px] leading-7')}>
            {body}
            {!loading &&
                <button
                    type='button'
                    aria-label='Copy message'
                    className='mt-1 flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted opacity-0 hover:bg-hover hover:text-fg focus:opacity-100 group-hover:opacity-100'
                    onClick={() => void navigator.clipboard.writeText(text)}
                >
                    <Copy className='h-3.5 w-3.5' aria-hidden='true' /> Copy
                </button>}
        </div>
    )
}
