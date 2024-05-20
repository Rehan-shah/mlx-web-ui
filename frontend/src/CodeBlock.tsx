
import { Clipboard } from 'lucide-react'
import React from 'react'
import Markdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism'




export default function CodeBlock(props: any) {
    const { children, className, node, ...rest } = props
    const match = /language-(\w+)/i.exec(className || '')
    return match ? (
        <>
            <div className='flex justify-between text-xs px-4 bg-[#f9f9f9] py-2 rounded-t-md -mb-2 w-full mt-2'>
                <p>{match[1].toLowerCase()}</p>
                <div className='flex  items-center cursor-pointer' onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}><Clipboard className='w-3 h-3' /> Copy code</div>
            </div>
            <SyntaxHighlighter
                {...rest}
                PreTag="div"
                children={String(children).replace(/\n$/, '')}
                language={match[1].toLowerCase()}
                className="rounded-b-md"
            />
        </>
    ) : (


        <code {...rest} className={className}>
            {children}
        </code>
    )
}
