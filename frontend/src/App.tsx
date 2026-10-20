import { useEffect, useRef, useState } from 'react'
import 'katex/dist/katex.min.css'
import './App.css'
import { fetchModels } from './api'
import { useAlert } from './alert-context'
import AlertProvider from './components/AlertProvider'
import ChatInput from './components/ChatInput'
import ChatMessage from './components/ChatMessage'
import IntroductionOverlay from './components/IntroductionOverlay'
import ModelSelection from './components/ModelSelection'
import { useChat } from './hooks/useChat'
import { loadDefaultConfig } from './lib/config'
import { cn } from './lib/utils'
import Sidebar from './Sidebar'

function App() {
    const showAlert = useAlert()
    const [intro, setIntro] = useState(() => loadDefaultConfig() === null)
    const [model, setModel] = useState("")
    const { conv, setConv, isStreaming, pendingId, tokenPerSec, send, stop } = useChat(model)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    }, [conv])

    // Pick the first available model once setup is complete.
    useEffect(() => {
        if (intro) return
        const config = loadDefaultConfig()
        if (config === null) return
        const controller = new AbortController()
        fetchModels(config.path, controller.signal)
            .then((models) => {
                if (models.length > 0) setModel((current) => current || models[0])
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return
                console.error(error)
                showAlert("Failed to load model, Check console for error")
            })
        return () => controller.abort()
    }, [intro, showAlert])

    return (
        <div>
            {intro && <IntroductionOverlay onDone={() => setIntro(false)} />}
            <div className={cn('flex h-screen w-screen overflow-clip', intro && 'blur-sm')}>
                <div className='w-64'>
                    <Sidebar setConv={setConv} conv={conv} />
                </div>
                <main className='w-5/6 px-5 pt-4'>
                    <div className='flex justify-between'>
                        <ModelSelection setModel={setModel} model={model} />
                        <p className='text-gray-500 py-2 px-4 text-sm' aria-label='Tokens per second'>{tokenPerSec}/s</p>
                    </div>
                    <div className='mx-auto my-0 w-4/6 pt-6'>
                        <div className='h-[80vh] overflow-y-auto' ref={scrollRef} aria-live='polite'>
                            {conv.map((message) => message.role === "system" ? null :
                                <ChatMessage
                                    key={message.id}
                                    text={message.content}
                                    role={message.role}
                                    loading={message.id === pendingId}
                                />)}
                        </div>
                        <div className='absolute bottom-0 w-[55vw] mb-5'>
                            <ChatInput isStreaming={isStreaming} onSend={send} onStop={stop} />
                            <p className='text-sm text-gray-300 pt-1'>Shift + enter for new line</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default function Main() {
    return (
        <AlertProvider>
            <App />
        </AlertProvider>
    )
}
