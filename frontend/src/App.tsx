import { useEffect, useRef, useState } from 'react'
import { Moon, PanelLeft, Sparkles, Sun } from 'lucide-react'
import 'katex/dist/katex.min.css'
import './App.css'
import { fetchModels } from './api'
import { useAlert } from './alert-context'
import AlertProvider from './components/AlertProvider'
import ChatInput from './components/ChatInput'
import ChatMessage from './components/ChatMessage'
import IntroductionOverlay from './components/IntroductionOverlay'
import ModelSelection from './components/ModelSelection'
import { INITIAL_CONVERSATION, useChat } from './hooks/useChat'
import { loadDefaultConfig } from './lib/config'
import { cn } from './lib/utils'
import Sidebar from './Sidebar'
import { useTheme } from './lib/theme'

function App() {
    const showAlert = useAlert()
    const [intro, setIntro] = useState(() => loadDefaultConfig() === null)
    const [model, setModel] = useState("")
    const { conv, setConv, isStreaming, pendingId, tokenPerSec, send, stop } = useChat(model)
    const { theme, toggle } = useTheme()
    const [sidebarOpen, setSidebarOpen] = useState(true)
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

    // The seeded greeting stays in context as a few-shot example but is not shown.
    const visible = conv.filter((m) => m.role !== "system" && !SEED_IDS.has(m.id))

    return (
        <div className='bg-bg text-fg'>
            {intro && <IntroductionOverlay onDone={() => setIntro(false)} />}
            <div className={cn('flex h-screen w-screen overflow-clip', intro && 'blur-sm')}>
                <Sidebar setConv={setConv} conv={conv} open={sidebarOpen} />
                <main className='relative flex min-w-0 flex-1 flex-col'>
                    <header className='flex h-14 shrink-0 items-center justify-between gap-2 px-3'>
                        <div className='flex min-w-0 items-center gap-1'>
                            <button type='button' onClick={() => setSidebarOpen((o) => !o)}
                                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                                className='rounded-md p-2 text-muted hover:bg-hover hover:text-fg'>
                                <PanelLeft className='h-4 w-4' aria-hidden='true' />
                            </button>
                            <div className='relative'>
                                <ModelSelection setModel={setModel} model={model} />
                            </div>
                        </div>
                        <div className='flex items-center gap-2'>
                            <span className='rounded-full border border-line px-2.5 py-0.5 font-mono text-xs tabular-nums text-muted' aria-label='Tokens per second'>{tokenPerSec} tok/s</span>
                            <button type='button' onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                                className='rounded-md p-2 text-muted hover:bg-hover hover:text-fg'>
                                {theme === 'dark' ? <Sun className='h-4 w-4' aria-hidden='true' /> : <Moon className='h-4 w-4' aria-hidden='true' />}
                            </button>
                        </div>
                    </header>
                    <div className='flex-1 overflow-y-auto' ref={scrollRef} aria-live='polite'>
                        <div className='mx-auto w-full max-w-[720px] px-6 pb-40 pt-6'>
                            {visible.length === 0
                                ? <EmptyState onPick={(p) => void send(p, [])} disabled={isStreaming} />
                                : visible.map((message) =>
                                    <ChatMessage
                                        key={message.id}
                                        text={message.content}
                                        role={message.role as "user" | "assistant"}
                                        loading={message.id === pendingId}
                                    />)}
                        </div>
                    </div>
                    <div className='pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent pt-8'>
                        <div className='pointer-events-auto mx-auto w-full max-w-[720px] px-6 pb-4'>
                            <ChatInput isStreaming={isStreaming} onSend={send} onStop={stop} />
                            <p className='pt-2 text-center text-[11px] text-muted'>Enter to send · Shift + Enter for new line</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

const SEED_IDS = new Set(INITIAL_CONVERSATION.map((m) => m.id))

const EXAMPLES = [
    "Explain how transformers work in simple terms",
    "Write a Python function to deduplicate a list",
    "Summarize the key ideas of stoicism",
    "Draft a polite follow-up email",
]

export function EmptyState({ onPick, disabled }: { onPick: (prompt: string) => void, disabled: boolean }) {
    return (
        <div className='flex min-h-[55vh] flex-col items-center justify-center text-center'>
            <div className='mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-panel'>
                <Sparkles className='h-4 w-4 text-accent' aria-hidden='true' />
            </div>
            <h1 className='text-xl font-semibold tracking-tight'>How can I help today?</h1>
            <p className='mt-1 text-sm text-muted'>Chat with a local model running on MLX.</p>
            <div className='mt-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-2'>
                {EXAMPLES.map((p) =>
                    <button key={p} type='button' disabled={disabled} onClick={() => onPick(p)}
                        className='rounded-xl border border-line px-4 py-3 text-left text-sm text-fg/80 transition-colors hover:border-fg/20 hover:bg-hover disabled:opacity-50'>
                        {p}
                    </button>)}
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
